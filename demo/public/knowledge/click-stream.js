function renderClickStream(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>点击流（Clickstream）是用户在会话（Session）内按时序排列的行为序列——
    包括页面浏览、点击、滚动、表单操作等原子事件。
    其核心价值在于<strong>路径分析</strong>（用户怎么走到转化/流失节点）和<strong>行为回放</strong>（精确复现用户操作）。
    与 PV/UV 的"计数"不同，点击流关注<strong>顺序与上下文</strong>，
    需要维护好<strong>会话 ID</strong> 和事件的<strong>序列号</strong>。`);

  const principle = `
    <p><strong>Session（会话）定义：</strong></p>
    <ul>
      <li>同一用户连续行为的时间窗口，常见策略：<strong>30 分钟无操作</strong>则开启新会话（Google Analytics 标准）</li>
      <li>跨天、跨浏览器、重新安装 App 也应开启新会话</li>
      <li>Session ID 通常存在 <code>sessionStorage</code>（关闭 Tab 即失效）</li>
    </ul>
    <p><strong>点击流数据模型：</strong></p>
    <ul>
      <li><code>sessionId</code>：会话唯一标识，用于分组同一次访问的所有事件</li>
      <li><code>eventSeq</code>：会话内自增序列号，保证事件顺序（网络乱序时可用序列号还原）</li>
      <li><code>prevEvent</code>：上一个事件 ID，记录事件链（路径分析用）</li>
      <li><code>dwell</code>：距上一事件的毫秒数（用户在每步的停留时间）</li>
    </ul>
    <p><strong>批量上报策略：</strong></p>
    <ol style="padding-left:20px;line-height:2;">
      <li>本地 Buffer 攒事件，满 <strong>N 条</strong>（如 20）或超过 <strong>T 秒</strong>（如 5s）批量发送</li>
      <li>页面卸载时（<code>pagehide</code>）强制 flush，用 <code>sendBeacon</code> 保证送达</li>
      <li>离线时存入 <code>IndexedDB</code>，网络恢复后补传（PWA / 弱网场景）</li>
    </ol>`;

  const sessionCode = `// Session 管理

const SESSION_KEY = '_sid';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 分钟

function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    const s = JSON.parse(raw);
    const now = Date.now();
    if (now - s.lastActive < SESSION_TIMEOUT) {
      s.lastActive = now;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s;
    }
  }
  // 新会话
  const s = {
    id: crypto.randomUUID?.() ?? Date.now().toString(36),
    startTime: Date.now(),
    lastActive: Date.now(),
    seq: 0,       // 会话内事件序列号
    prevId: null, // 上一个事件 ID
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return s;
}

function nextSeq() {
  const s = getSession();
  s.seq += 1;
  s.lastActive = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  return { sessionId: s.id, seq: s.seq, prevId: s.prevId };
}`;

  const bufferCode = `// 点击流事件收集与批量上报

class ClickStreamCollector {
  constructor({ maxBatch = 20, flushInterval = 5000 } = {}) {
    this.buffer = [];
    this.maxBatch = maxBatch;
    this.timer = setInterval(() => this.flush(), flushInterval);
    window.addEventListener('pagehide', () => {
      clearInterval(this.timer);
      this.flush(true); // 强制同步 flush
    }, { once: true });
  }

  push(event) {
    const { sessionId, seq, prevId } = nextSeq();
    const entry = {
      id: crypto.randomUUID?.() ?? seq.toString(),
      sessionId,
      seq,
      prevId,
      ts: Date.now(),
      ...event,
    };
    // 更新 prevId（用于下一个事件的链路记录）
    const s = getSession();
    s.prevId = entry.id;
    sessionStorage.setItem('_sid', JSON.stringify(s));

    this.buffer.push(entry);
    if (this.buffer.length >= this.maxBatch) this.flush();
    return entry;
  }

  flush(beacon = false) {
    if (!this.buffer.length) return;
    const batch = this.buffer.splice(0); // 清空 buffer
    const payload = JSON.stringify({ events: batch });

    if (beacon || !document.hidden) {
      // pagehide 或后台时用 sendBeacon（不等响应）
      if (!navigator.sendBeacon('/api/clickstream', payload)) {
        fetch('/api/clickstream', { method:'POST', body: payload, keepalive: true });
      }
    } else {
      fetch('/api/clickstream', { method:'POST', body: payload });
    }
  }
}

const collector = new ClickStreamCollector();

// 统一 track 接口
function trackEvent(name, props = {}) {
  return collector.push({ event: name, url: location.href, ...props });
}`;

  const autoTrackCode = `// 自动采集点击流（DOM 事件 + 滚动深度）

// 点击事件自动采集
document.addEventListener('click', e => {
  const el = e.target;
  trackEvent('click', {
    tagName: el.tagName.toLowerCase(),
    text: el.textContent?.trim().slice(0, 80),
    href: el.href ?? null,
    trackId: el.dataset.trackid ?? null, // 业务语义标注
    x: e.clientX,
    y: e.clientY,
  });
}, { capture: true, passive: true });

// 滚动深度采集（每触达 25% / 50% / 75% / 100% 上报一次）
const depthReported = new Set();
window.addEventListener('scroll', () => {
  const total = document.body.scrollHeight - window.innerHeight;
  if (total <= 0) return;
  const pct = Math.floor((window.scrollY / total) * 100);
  [25, 50, 75, 100].forEach(milestone => {
    if (pct >= milestone && !depthReported.has(milestone)) {
      depthReported.add(milestone);
      trackEvent('scroll_depth', { depth: milestone });
    }
  });
}, { passive: true });

// 表单提交
document.addEventListener('submit', e => {
  trackEvent('form_submit', {
    formId: e.target.id,
    formAction: e.target.action,
  });
}, { capture: true });`;

  const notes = [
    ruleBox('warning', `<strong>事件序列号的必要性：</strong>移动端弱网下，批次上报可能乱序到达服务端。<code>seq</code>（会话内自增）+ <code>ts</code>（客户端时间戳）双重保障排序。客户端时间可能因系统时间偏差失真，服务端收到后打上 <code>serverTs</code>，数仓以 <code>serverTs</code> 为准，用 <code>seq</code> 排序同毫秒事件。`),
    ruleBox('info', `<strong>用户行为回放实现原理：</strong>除点击流外，行为回放 SDK（如 rrweb）还会捕获 <strong>DOM 快照</strong>（序列化为 JSON）和 <strong>DOM Mutation</strong>（MutationObserver）。回放时从快照还原初始状态，按时间轴重放 Mutation + 事件，可精确复现用户看到的界面。存储代价较大，一般只对异常会话开启。`),
    ruleBox('success', `<strong>路径分析数仓设计：</strong>点击流数据存入明细表（one row per event），通过 <code>sessionId + seq</code> 重建路径。常见分析：① 漏斗分析——特定事件序列的转化率；② 路径流向图（Sankey）——各节点的进出流量；③ 流失分析——在哪个步骤离开最多。使用 SQL <code>LEAD/LAG</code> 窗口函数或专用 MDA 工具（Mixpanel、神策）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('会话模型与数据结构', principle)}
    ${section('代码示例', codeBlock('Session 管理', 'dot-blue', 'javascript', sessionCode) + codeBlock('批量上报 Buffer', 'dot-green', 'javascript', bufferCode) + codeBlock('自动采集（点击/滚动/表单）', 'dot-yellow', 'javascript', autoTrackCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
