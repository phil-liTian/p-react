function renderPvUv(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>
    <strong>PV（Page View）</strong>= 页面被加载的次数，同一用户刷新多次算多次；
    <strong>UV（Unique Visitor）</strong>= 去重后的访问用户数，通常以 Cookie / fingerprint 标识。
    <strong>停留时长</strong>= 用户在页面上的有效交互时间，不等于"关闭时间 - 打开时间"——
    需要扣除切换到后台的时间（<code>visibilitychange</code>），才能反映真实阅读行为。`);

  const principle = `
    <p><strong>PV 统计：</strong></p>
    <ul>
      <li><strong>MPA（多页应用）：</strong>每次导航触发完整页面加载，在 <code>DOMContentLoaded</code> 或 <code>load</code> 事件里上报即可</li>
      <li><strong>SPA（单页应用）：</strong>路由切换不刷新页面，需要 Hook Router 的 <code>push/replace</code> 方法或监听 <code>popstate/hashchange</code> 事件</li>
    </ul>
    <p><strong>UV 标识方案对比：</strong></p>
    <ul>
      <li><code>Cookie</code>：跨 Tab 共享，可设 30 天有效期，Safari ITP 限制第三方 Cookie</li>
      <li><code>localStorage</code>：同域持久化，用户清除浏览数据后丢失</li>
      <li><strong>设备指纹</strong>：综合 UA、屏幕分辨率、字体、Canvas 哈希等生成，可跨浏览器识别，但计算重、有隐私争议</li>
      <li><strong>登录 ID</strong>：精度最高，是数仓 UV 分析的首选；匿名用户使用 Cookie/localStorage 临时 ID，登录后关联</li>
    </ul>
    <p><strong>停留时长三种统计口径：</strong></p>
    <ol style="padding-left:20px;line-height:2;">
      <li><strong>总时长</strong>：<code>beforeunload</code> - 页面加载时间（含后台停留，偏大）</li>
      <li><strong>可见时长</strong>：用 <code>visibilitychange</code> 累计前台时间（推荐）</li>
      <li><strong>有效互动时长</strong>：在可见时长基础上，超过 N 秒无鼠标/键盘活动则暂停计时（最贴近阅读意图）</li>
    </ol>`;

  const pvCode = `// SPA 路由 PV 统计（React Router / Vue Router 通用方案）

// 方案：监听 history API + popstate
const originalPush = history.pushState.bind(history);
const originalReplace = history.replaceState.bind(history);

function onRouteChange(url) {
  track('page_view', {
    url,
    referrer: document.referrer,
    title: document.title,
  });
}

history.pushState = function(...args) {
  originalPush(...args);
  onRouteChange(location.href);
};

history.replaceState = function(...args) {
  originalReplace(...args);
  onRouteChange(location.href);
};

// popstate 处理浏览器前进/后退
window.addEventListener('popstate', () => onRouteChange(location.href));

// 页面初始加载时上报
onRouteChange(location.href);`;

  const uvCode = `// UV 标识生成与存储

const UV_KEY = '_uvid';
const UV_TTL = 30 * 24 * 60 * 60 * 1000; // 30 天

function getOrCreateUvId() {
  const stored = localStorage.getItem(UV_KEY);
  if (stored) {
    const { id, exp } = JSON.parse(stored);
    if (Date.now() < exp) return id;
  }
  // 生成新 UV ID（crypto.randomUUID 兼容性好，Chrome 92+）
  const id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(UV_KEY, JSON.stringify({ id, exp: Date.now() + UV_TTL }));
  return id;
}

// 登录后将匿名 ID 与 userId 关联（身份合并）
function associateUser(userId) {
  const anonymousId = getOrCreateUvId();
  track('identity', {
    anonymousId,
    userId,
    // 后端用此事件将历史行为归并到同一用户
  });
}`;

  const durationCode = `// 停留时长统计（可见时长，扣除后台时间）

class StayDuration {
  constructor() {
    this.start = Date.now();
    this.visible = 0;       // 累计可见毫秒数
    this.lastVisible = Date.now();
    this.active = !document.hidden;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 切到后台：累加本次可见时长
        if (this.active) {
          this.visible += Date.now() - this.lastVisible;
          this.active = false;
        }
      } else {
        // 切回前台：重置计时起点
        this.lastVisible = Date.now();
        this.active = true;
      }
    });

    // 页面卸载时上报（用 sendBeacon 保证送达）
    window.addEventListener('pagehide', () => this.report(), { once: true });
    // pagehide 比 beforeunload 更可靠（iOS Safari 不触发 beforeunload）
  }

  getVisible() {
    if (this.active) return this.visible + (Date.now() - this.lastVisible);
    return this.visible;
  }

  report() {
    navigator.sendBeacon('/api/track', JSON.stringify({
      event: 'page_leave',
      url: location.href,
      totalDuration: Date.now() - this.start,
      visibleDuration: this.getVisible(), // 推荐指标
    }));
  }
}

const stayDuration = new StayDuration();`;

  const notes = [
    ruleBox('warning', `<strong>SPA PV 统计最常见的坑：</strong>① 路由切换时 <code>document.title</code> 还没更新，异步更新标题时需延迟 0ms 再读；② <code>hashchange</code> 只在 hash 模式下触发，<code>popstate</code> 不覆盖 <code>history.pushState</code>，两者都要监听；③ 同一路由参数变化（如分页）是否算新 PV，要与业务方对齐口径。`),
    ruleBox('info', `<strong>UV 去重的时间窗口：</strong>日 UV = 当天自然日内去重；月 UV = 当月内去重。后端通常用 <strong>HyperLogLog</strong>（Redis <code>PFADD/PFCOUNT</code>）做大规模 UV 近似统计，误差 ≈0.81%，内存远低于 Set 精确去重。`),
    ruleBox('success', `<strong>pagehide vs beforeunload：</strong>现代浏览器（尤其移动端）有 bfcache（往返缓存），<code>beforeunload</code> 会阻止页面进入 bfcache，Google 建议改用 <code>pagehide</code> 上报离开时间。<code>sendBeacon</code> 在 <code>pagehide</code> 中也能可靠发送。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('统计原理', principle)}
    ${section('代码示例', codeBlock('SPA 路由 PV 统计', 'dot-blue', 'javascript', pvCode) + codeBlock('UV 标识生成', 'dot-green', 'javascript', uvCode) + codeBlock('停留时长（可见时长）', 'dot-yellow', 'javascript', durationCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
