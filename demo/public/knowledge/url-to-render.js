function renderUrlToRender(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>从输入 URL 到看到页面，经历了 <strong>DNS 解析 → TCP 三次握手 → TLS 握手 → HTTP 请求/响应 → 浏览器渲染流水线</strong> 五大阶段。
    每个阶段都是优化的切入点：缓存 DNS、复用连接（Keep-Alive / HTTP/2）、减小响应体、缩短关键渲染路径。`);

  const principle = `
    <p><strong>完整流程（10 步）：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li><strong>URL 解析</strong>：浏览器拆解协议、主机名、路径、查询参数；若输入非 URL 则交给默认搜索引擎</li>
      <li><strong>DNS 解析</strong>：浏览器缓存 → OS 缓存 → 本地 hosts → 递归 DNS 查询（根域 → TLD → 权威 DNS）；CDN 会在此环节返回就近节点 IP</li>
      <li><strong>TCP 三次握手</strong>：SYN → SYN-ACK → ACK，建立可靠连接；HTTPS 额外完成 TLS 1.3 握手（1-RTT 或 0-RTT）</li>
      <li><strong>发送 HTTP 请求</strong>：浏览器构造请求头（包含 Cookie、缓存校验头），发送 GET 请求</li>
      <li><strong>服务端处理并响应</strong>：Nginx / CDN 边缘节点或应用服务器处理，返回 HTML（状态码 200 / 304 / 301…）</li>
      <li><strong>解析 HTML，构建 DOM 树</strong>：HTML 解析器流式处理字节流，遇到 <code>&lt;script&gt;</code> 停止（除非 async/defer）</li>
      <li><strong>下载并解析 CSS，构建 CSSOM</strong>：阻塞渲染（浏览器等待 CSSOM 完成才构建渲染树）</li>
      <li><strong>构建渲染树，执行 Layout</strong>：DOM + CSSOM → 渲染树，计算每个可见节点的几何信息</li>
      <li><strong>Paint（光栅化）</strong>：将渲染树转为像素，分图层绘制</li>
      <li><strong>Composite（合成）</strong>：合成线程将各层合并，由 GPU 上屏，用户看到页面</li>
    </ol>`;

  const networkCode = `// ── DNS + 连接优化 ──────────────────────────────────────────────────────────
// 1. 预解析第三方域名（节省 100-300ms DNS 查询时间）
// <link rel="dns-prefetch" href="//cdn.example.com">
// <link rel="preconnect" href="https://fonts.googleapis.com">

// 2. 查看 DNS 解析耗时（PerformanceNavigationTiming）
const nav = performance.getEntriesByType('navigation')[0];
console.log({
  dns:      nav.domainLookupEnd - nav.domainLookupStart,  // DNS 解析
  tcp:      nav.connectEnd - nav.connectStart,             // TCP 握手
  tls:      nav.connectEnd - nav.secureConnectionStart,   // TLS 握手
  ttfb:     nav.responseStart - nav.requestStart,          // 首字节时间
  download: nav.responseEnd - nav.responseStart,           // 响应体下载
  domParse: nav.domContentLoadedEventEnd - nav.responseEnd, // DOM 解析
});

// 3. HTTP/2 多路复用：同一连接并行发多个请求，消除 HTTP/1.1 的队头阻塞
// 配置 Nginx: http2 on; （现代浏览器自动协商使用 H2）`;

  const renderCode = `// ── 渲染流水线关键节点 ────────────────────────────────────────────────────────
// 阻塞渲染的常见原因及优化：

// ✗ 问题 1：<head> 中同步 <script> 阻塞 HTML 解析
// <script src="app.js"><\/script>  ← 停止解析，下载+执行完才继续

// ✓ 修复：加 defer（下载并行，DOMContentLoaded 前按序执行）
// <script src="app.js" defer><\/script>

// ✗ 问题 2：CSS 阻塞渲染（CSSOM 未完成不绘制）
// 加载 2MB 的 all-in-one.css，首屏只用其中 10%

// ✓ 修复：关键 CSS 内联，非首屏 CSS 异步加载
// <style>/* 关键 CSS，约 5-10KB */</style>
// <link rel="stylesheet" href="rest.css" media="print" onload="this.media='all'">

// 监听关键渲染节点
document.addEventListener('DOMContentLoaded', () => {
  // DOM 解析完成（CSSOM 不一定完成）
  console.log('DOM ready:', performance.now(), 'ms');
});

window.addEventListener('load', () => {
  // 所有资源（图片、CSS、JS）加载完毕
  const { loadEventEnd, navigationStart } = performance.timing;
  console.log('Page load:', loadEventEnd - navigationStart, 'ms');
});`;

  const notes = [
    ruleBox('warning', `<strong>TLS 1.3 vs TLS 1.2：</strong>TLS 1.2 需要 2-RTT 握手（约 200ms 额外延迟），TLS 1.3 优化为 1-RTT，且支持 0-RTT 会话恢复（复用之前的会话密钥，首字节时间接近 0 额外开销）。2024 年主流浏览器与服务器均默认使用 TLS 1.3。`),
    ruleBox('info', `<strong>预加载扫描器（Preload Scanner）：</strong>浏览器在主 HTML 解析器被 <code>&lt;script&gt;</code> 阻塞时，会有一个辅助扫描器提前扫描剩余 HTML，找出 <code>&lt;img&gt;</code>、<code>&lt;link&gt;</code>、<code>&lt;script&gt;</code> 并提前发起下载，这就是为什么即使有同步 script，图片仍能并行下载。`),
    ruleBox('success', `<strong>QUIC / HTTP/3：</strong>基于 UDP，消除了 TCP 层面的队头阻塞，弱网环境（丢包率 2% 以上）性能显著优于 HTTP/2。Chrome 已默认尝试 H3，服务端返回 <code>Alt-Svc: h3=":443"</code> 头即可启用。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('网络层性能采集与优化', 'dot-blue', 'javascript', networkCode) + codeBlock('渲染层优化关键节点', 'dot-green', 'javascript', renderCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
