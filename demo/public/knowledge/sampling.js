function renderSampling(t) {
  const question = ruleBox('warning',
    `<strong>结论：</strong>不能对所有用户全量上报——高日活应用全量上报会产生数以亿计的事件，超出存储和计算预算。
    采样率设计的核心原则：<strong>普通事件按比例随机采样，异常事件零采样（100% 上报）</strong>。
    采样必须在<em>用户维度</em>保持一致（同一用户的会话始终采或不采），而非每个事件独立投骰子，否则用户行为序列会不完整。`);

  const principle = `
    <p><strong>采样策略分类：</strong></p>
    <ul>
      <li><strong>头部采样（Head-based sampling）：</strong>在会话/请求入口一次性决定是否采样，后续所有事件跟随此决定。保证数据完整性，但无法根据后续异常"补录"。</li>
      <li><strong>尾部采样（Tail-based sampling）：</strong>先暂存所有事件，在会话结束时根据是否有错误/慢查询决定是否保留。数据最完整，但对内存和存储有额外压力，通常在 APM 系统（如 Jaeger）中使用。</li>
      <li><strong>动态采样：</strong>根据实时错误率、流量峰值自动调整采样率。平时 1%，出故障时自动切到 100% 以获取完整现场。</li>
    </ul>
    <p><strong>用户级采样 vs 事件级采样的区别：</strong></p>
    <p>
      <em>事件级采样</em>：每个事件独立以 10% 概率上报。结果：同一用户 100 次点击，只记录约 10 次，行为路径残缺，无法做漏斗分析。<br>
      <em>用户级采样</em>：对用户 ID 做哈希，落入某个桶的用户上报全部事件，其余用户完全不上报。结果：被采用户的数据完整，可以做完整的行为分析，并按采样率换算总量。
    </p>
    <p><strong>上报策略的三个维度：</strong></p>
    <ul>
      <li><strong>时机：</strong>立即上报（错误、支付等关键事件）vs 批量延迟上报（普通行为事件，每 5s 或 20 条一批）</li>
      <li><strong>优先级：</strong>错误 > 性能 > 行为。错误零采样立即发，性能指标低采样批量发，行为事件高采样批量发</li>
      <li><strong>重试：</strong>网络失败的事件持久化到 localStorage，下次页面加载时重试上报</li>
    </ul>`;

  const samplingCode = `// 用户级一致性采样（推荐方案）

// 对用户 ID 做简单哈希，落入 [0, 1) 范围
// 同一 userId 永远返回同一个值，保证用户级一致性
function hashUserId(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0; // uint32
  }
  return hash / 0xFFFFFFFF; // 归一化到 [0, 1)
}

function shouldSample(userId, rate) {
  if (rate >= 1) return true;  // 全量上报
  if (rate <= 0) return false; // 完全关闭
  return hashUserId(userId) < rate;
}

// 初始化时决定当前用户是否在采样范围内
// 后续所有普通事件共用此决定（用户级一致性）
const SAMPLE_RATE = 0.1; // 10%
const userId = getUserId(); // 从 cookie / localStorage 取
const IS_SAMPLED = shouldSample(userId, SAMPLE_RATE);

function track(event) {
  // 错误/关键事件：零采样，始终上报
  if (event.type === 'error' || event.type === 'crash' || event.critical) {
    reporter.send(event);
    return;
  }
  // 普通事件：按用户级采样
  if (!IS_SAMPLED) return;
  reporter.push(event);
}`;

  const dynamicCode = `// 动态采样率：故障时自动提升采样比例

class DynamicSampler {
  constructor({ normalRate = 0.05, errorRateThreshold = 0.01 } = {}) {
    this.normalRate = normalRate;        // 平时 5%
    this.errorRateThreshold = errorRateThreshold; // 错误率超 1% 触发提升
    this.currentRate = normalRate;
    this.errorCount = 0;
    this.totalCount = 0;
    // 每分钟重新评估
    setInterval(() => this._evaluate(), 60_000);
  }

  record(isError) {
    this.totalCount++;
    if (isError) this.errorCount++;
  }

  _evaluate() {
    const errorRate = this.totalCount > 0
      ? this.errorCount / this.totalCount
      : 0;

    if (errorRate > this.errorRateThreshold) {
      // 错误率偏高：提升到 100% 以获取完整现场
      this.currentRate = 1.0;
      console.warn(\`[Sampler] Error rate \${(errorRate * 100).toFixed(1)}%, switched to 100% sampling\`);
    } else {
      // 恢复正常
      this.currentRate = this.normalRate;
    }

    // 重置计数
    this.errorCount = 0;
    this.totalCount = 0;
  }

  shouldSample(userId) {
    return shouldSample(userId, this.currentRate);
  }
}

const sampler = new DynamicSampler({ normalRate: 0.05, errorRateThreshold: 0.01 });`;

  const retryCode = `// 离线缓存与重试：网络失败时持久化，下次启动时补传

const STORAGE_KEY = '__track_queue__';
const MAX_CACHED = 200; // 防止无限积累

function saveToDisk(events) {
  try {
    const existing = loadFromDisk();
    const merged = [...existing, ...events].slice(-MAX_CACHED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // localStorage 写满或禁用，静默忽略
  }
}

function loadFromDisk() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function clearDisk() {
  localStorage.removeItem(STORAGE_KEY);
}

// 页面加载时，尝试重传上次失败的事件
window.addEventListener('load', async () => {
  const pending = loadFromDisk();
  if (pending.length === 0) return;

  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: pending, retry: true }),
    });
    clearDisk(); // 成功后清除
  } catch {
    // 仍然失败，保留本地，等下次
  }
});`;

  const notes = [
    ruleBox('warning', `<strong>事件级采样的常见误用：</strong>对行为事件（点击、页面停留）做事件级采样会导致同一用户的行为序列随机缺失，漏斗分析无意义（步骤 1 有 100 个用户，步骤 2 只剩 8 个，但转化率真的是 8% 吗？）。<strong>行为事件必须使用用户级采样或会话级采样</strong>，对<em>哪些用户</em>采样，而非对<em>哪些事件</em>采样。`),
    ruleBox('info', `<strong>采样率与数据总量的换算：</strong>若采样率为 10%，采集到的 PV 为 50,000，则估算真实 PV 为 500,000。换算时需注意：采样误差与采样率和样本量有关，样本量越大误差越小。小流量业务（日活 < 10w）建议全量上报，采样的收益不如数据准确性重要。`),
    ruleBox('success', `<strong>分级上报策略小结：</strong>① <em>错误/崩溃</em>：100% 立即上报（Beacon）；② <em>性能指标</em>（LCP/CLS 等）：30% 用户级采样，批量上报；③ <em>业务行为事件</em>（点击流、页面停留）：5%~10% 用户级采样，5 秒一批；④ <em>调试日志</em>（console.log 级别）：仅在开发/灰度环境上报，生产环境关闭。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('用户级一致性采样（✓ 推荐）', 'dot-green', 'javascript', samplingCode) + codeBlock('动态采样率（故障时自动扩量）', 'dot-blue', 'javascript', dynamicCode) + codeBlock('离线缓存与重试（✗ 不能丢的事件）', 'dot-red', 'javascript', retryCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
