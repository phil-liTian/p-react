function renderLogAggregation(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>前端日志的核心问题是<em>量大、噪音多、无法直接告警</em>。
    聚合的目标是把海量的原始日志压缩成有意义的<strong>事件指纹（fingerprint）</strong>——相同原因的错误只计一条，附带发生次数和影响用户数。
    告警建立在聚合结果之上：不是"发生了错误"，而是"过去 5 分钟，<code>TypeError: Cannot read 'x'</code> 在 <code>/checkout</code> 页面影响了 <strong>128</strong> 个用户，同比上升 <strong>3×</strong>"。`);

  const principle = `
    <p><strong>日志分级（遵循 RFC 5424 精简版）：</strong></p>
    <ul>
      <li><strong>ERROR：</strong>未捕获异常、Promise rejection、资源加载失败。必须 100% 上报，触发告警。</li>
      <li><strong>WARN：</strong>降级处理、重试成功、非致命异常。按 30% 采样上报，用于趋势分析。</li>
      <li><strong>INFO：</strong>关键业务节点（支付完成、登录成功）。按用户采样，用于行为分析。</li>
      <li><strong>DEBUG：</strong>详细调试信息。仅在开发/灰度环境上报，生产关闭。</li>
    </ul>
    <p><strong>事件指纹（fingerprint）——聚合去重的核心：</strong></p>
    <p>
      同一个 bug 在 10,000 个用户上触发会产生 10,000 条日志，但本质是同一个问题。
      指纹算法提取 <em>错误类型 + 消息模板 + 调用栈顶层帧</em>，生成 hash，相同 hash 的日志归为一组。
      告警和看板以<em>指纹组</em>为粒度展示，而非原始日志条数。
    </p>
    <p><strong>聚合维度：</strong></p>
    <ul>
      <li><strong>时间窗口：</strong>按分钟/小时滚动聚合，计算每个窗口的发生次数（count）和影响用户数（affected_users）</li>
      <li><strong>页面路径：</strong>同一错误在不同页面的分布，定位问题范围</li>
      <li><strong>版本/Commit：</strong>区分新旧版本，快速判断是否为新上线引入的回归</li>
      <li><strong>环境：</strong>浏览器、OS、网络类型——区分全局问题和特定环境问题</li>
    </ul>`;

  const fingerprintCode = `// 错误指纹生成：相同根因的错误归为一组

function computeFingerprint(error) {
  // 从调用栈中提取顶层有意义的帧（跳过上报框架自身的帧）
  const topFrame = parseTopFrame(error.stack);

  // 指纹由：错误类型 + 消息模板（去掉变量部分） + 顶层帧 构成
  const raw = [
    error.name ?? 'Error',
    normalizeMessage(error.message),
    topFrame ? \`\${topFrame.file}:\${topFrame.line}\` : 'unknown',
  ].join('|');

  return cyrb53(raw); // 轻量哈希，非加密
}

// 去除消息中的动态部分，将变量替换为占位符
// "Cannot read property 'name' of undefined" → "Cannot read property '{prop}' of {type}"
function normalizeMessage(msg) {
  return msg
    .replace(/'[^']+'/g, "'{str}'")  // 单引号字符串
    .replace(/\b\d+\b/g, '{n}')      // 纯数字
    .replace(/https?:\/\/\S+/g, '{url}'); // URL
}

function parseTopFrame(stack) {
  if (!stack) return null;
  const lines = stack.split('\n');
  for (const line of lines.slice(1)) { // 跳过第一行（错误消息本身）
    const m = line.match(/at\s+(?:\S+\s+)?\(?(.+?):(\d+):\d+\)?/);
    if (m) {
      const file = m[1].replace(location.origin, ''); // 去掉域名前缀
      // 跳过 node_modules 和上报框架本身
      if (file.includes('node_modules') || file.includes('tracker')) continue;
      return { file, line: parseInt(m[2]) };
    }
  }
  return null;
}

// cyrb53 轻量哈希（不保证碰撞安全，仅用于分组）
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}`;

  const aggregatorCode = `// 前端本地预聚合：减少上报量，服务端做二次聚合

class LogAggregator {
  constructor({ flushInterval = 10_000, maxGroups = 100 } = {}) {
    this.groups = new Map(); // fingerprint → AggregatedEvent
    this.maxGroups = maxGroups;
    this.timer = setInterval(() => this.flush(), flushInterval);
  }

  // 将原始错误合并进对应指纹组
  collect(error, context = {}) {
    const fp = computeFingerprint(error);

    if (!this.groups.has(fp)) {
      if (this.groups.size >= this.maxGroups) {
        // 组数过多说明错误种类爆炸，直接上报原始数据
        this._sendRaw(error, context);
        return;
      }
      this.groups.set(fp, {
        fingerprint: fp,
        name: error.name,
        message: normalizeMessage(error.message),
        stack: error.stack,
        // 第一次出现的完整上下文（最有诊断价值）
        firstOccurrence: { ...context, ts: Date.now() },
        count: 0,
        affectedUsers: new Set(),
        urls: new Set(),
      });
    }

    const group = this.groups.get(fp);
    group.count++;
    if (context.userId) group.affectedUsers.add(context.userId);
    if (context.url) group.urls.add(context.url);
  }

  flush() {
    if (this.groups.size === 0) return;

    const payload = [...this.groups.values()].map(g => ({
      ...g,
      affectedUsers: g.affectedUsers.size, // Set 转数字
      urls: [...g.urls].slice(0, 5),       // 最多上报 5 个 URL
    }));

    this.groups.clear();

    navigator.sendBeacon('/api/logs/aggregated', JSON.stringify({
      events: payload,
      windowStart: Date.now() - 10_000,
      windowEnd: Date.now(),
      sessionId: getSessionId(),
    }));
  }

  _sendRaw(error, context) {
    navigator.sendBeacon('/api/logs/raw', JSON.stringify({ error: error.message, stack: error.stack, context }));
  }

  destroy() {
    clearInterval(this.timer);
    this.flush();
  }
}

const aggregator = new LogAggregator();

// 接入全局错误捕获
window.addEventListener('error', e => {
  aggregator.collect(e.error ?? new Error(e.message), {
    url: location.href, userId: getUser()?.id,
    type: 'uncaught', resource: e.filename,
  });
});
window.addEventListener('unhandledrejection', e => {
  const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
  aggregator.collect(err, { url: location.href, userId: getUser()?.id, type: 'unhandled_rejection' });
});`;

  const alertCode = `// 服务端告警规则示例（伪代码，展示逻辑）

// 规则 1：错误率告警（新错误指纹突然出现大量上报）
function checkNewErrorSpike(fingerprint, countInWindow, prevCount) {
  const isNew = prevCount === 0;
  const isSpiking = prevCount > 0 && countInWindow / prevCount > 3; // 3 倍增长

  if (isNew && countInWindow > 50) {
    triggerAlert({
      level: 'P1',
      title: \`新错误：\${fingerprint.message}\`,
      detail: \`过去 5 分钟首次出现，已影响 \${fingerprint.affectedUsers} 用户\`,
    });
  }
  if (isSpiking) {
    triggerAlert({
      level: 'P1',
      title: \`错误激增：\${fingerprint.message}\`,
      detail: \`同比上升 \${Math.round(countInWindow / prevCount)}×，当前 \${countInWindow} 次/5min\`,
    });
  }
}

// 规则 2：白屏率告警
function checkWhiteScreenRate(whiteScreenPV, totalPV) {
  const rate = whiteScreenPV / totalPV;
  if (rate > 0.01) triggerAlert({ level: 'P0', title: '白屏率超 1%' });
  else if (rate > 0.001) triggerAlert({ level: 'P1', title: '白屏率超 0.1%' });
}

// 规则 3：接口成功率下降（前端 fetch 上报请求结果）
function checkApiSuccessRate(apiPath, failCount, totalCount) {
  const successRate = 1 - failCount / totalCount;
  if (successRate < 0.95) {
    triggerAlert({
      level: 'P1',
      title: \`接口成功率下降：\${apiPath}\`,
      detail: \`当前 \${(successRate * 100).toFixed(1)}%，低于 95% 阈值\`,
    });
  }
}`;

  const notes = [
    ruleBox('warning', `<strong>前端聚合 vs 服务端聚合：</strong>前端本地聚合（如上面的 <code>LogAggregator</code>）只是<em>预聚合</em>，减少网络请求量。最终的告警判断必须在服务端完成——因为前端每个用户是独立的，无法知道全局的错误率。服务端需要把所有客户端上报的聚合数据再做一次合并，才能得到真实的全局指标。`),
    ruleBox('info', `<strong>指纹冲突（不同错误被聚合到同一组）：</strong>规避方法：指纹中加入调用栈的前 3 帧而非只取顶层帧；对 <em>eval</em> 执行的代码和 <em>third-party scripts</em> 单独分组（文件 URL 包含第三方域名则单独桶）；定期人工 review 指纹组，合并同类或拆分误聚合的。`),
    ruleBox('success', `<strong>与 Sentry 等工具的关系：</strong>Sentry 内置了指纹生成、聚合、告警全套能力。如果已用 Sentry，无需自己实现这套逻辑——接入 <code>@sentry/browser</code> 即可。自建的场景：① 数据不能出境（金融/政务）；② 需要与内部风控/业务数据联动的定制化告警；③ 上报量极大，Sentry 定价不可接受。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('错误指纹生成（聚合去重核心）', 'dot-blue', 'javascript', fingerprintCode) + codeBlock('前端本地预聚合器', 'dot-green', 'javascript', aggregatorCode) + codeBlock('服务端告警规则示意', 'dot-yellow', 'javascript', alertCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
