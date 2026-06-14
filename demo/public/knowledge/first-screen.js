function renderFirstScreen(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>首屏优化的核心是缩短「关键渲染路径（Critical Rendering Path）」——
    减少阻塞渲染的资源、优先加载首屏必要内容、延迟非关键资源。
    目标：<strong>LCP &lt; 2.5s，FCP &lt; 1.8s</strong>。`);

  const principle = `
    <p><strong>关键渲染路径（CRP）</strong>是浏览器从收到 HTML 到首次渲染可见内容的流程：</p>
    <ul>
      <li>解析 HTML → 构建 DOM 树</li>
      <li>下载 CSS → 构建 CSSOM（<strong>阻塞渲染</strong>：CSSOM 未完成，渲染树无法构建）</li>
      <li>遇到 <code>&lt;script&gt;</code>（无 async/defer）→ 停止 HTML 解析，执行 JS（<strong>阻塞解析</strong>）</li>
      <li>DOM + CSSOM → 渲染树 → Layout → Paint → Composite</li>
    </ul>
    <p><strong>优化方向：</strong></p>
    <ul>
      <li><strong>减少关键资源数量</strong>：内联关键 CSS，延迟非首屏 CSS（media query）</li>
      <li><strong>减少关键资源体积</strong>：压缩 HTML/CSS/JS，Gzip/Brotli 压缩</li>
      <li><strong>减少关键资源 RTT</strong>：CDN 加速、HTTP/2 多路复用、资源预连接</li>
      <li><strong>SSR / SSG</strong>：服务端直出首屏 HTML，避免客户端渲染的白屏时间</li>
    </ul>`;

  const badCode = `<!-- ✗ 阻塞首屏的常见错误 -->
<head>
  <!-- 外部 CSS 阻塞渲染，且未预加载 -->
  <link rel="stylesheet" href="all-styles.css"> <!-- 包含首屏不需要的样式 -->

  <!-- 同步 script 阻塞 HTML 解析 -->
  <script src="analytics.js"><\/script>
  <script src="vendor.js"><\/script> <!-- 放在 head 里最糟糕 -->
</head>
<body>
  <!-- LCP 图片没有 preload，发现滞后 -->
  <img class="hero" src="hero.jpg">

  <!-- 字体未预加载，渲染时触发 FOUT -->
  <style>
    body { font-family: 'CustomFont', sans-serif; }
  </style>
</body>`;

  const goodCode = `<!-- ✓ 关键渲染路径优化实践 -->
<head>
  <!-- 预连接到关键第三方域名（DNS + TCP + TLS 提前完成） -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://cdn.example.com" crossorigin>

  <!-- 预加载 LCP 图片，避免发现延迟 -->
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

  <!-- 预加载关键字体 -->
  <link rel="preload" as="font" href="/fonts/inter-400.woff2" crossorigin>

  <!-- 关键 CSS 内联，避免额外网络请求 -->
  <style>
    /* 仅包含首屏 above-the-fold 的最小 CSS */
    .hero { width: 100%; aspect-ratio: 16/9; }
  </style>

  <!-- 非关键 CSS 异步加载 -->
  <link rel="stylesheet" href="non-critical.css" media="print" onload="this.media='all'">
</head>
<body>
  <!-- LCP 图片：高优先级 + 现代格式 + 尺寸声明（防 CLS） -->
  <img class="hero" src="/hero.webp"
    width="1200" height="675"
    fetchpriority="high"
    alt="Hero image">

  <!-- 非关键 JS 异步加载，不阻塞解析 -->
  <script src="analytics.js" defer><\/script>
  <!-- 模块脚本默认 defer -->
</body>

<!-- JavaScript 优化策略 -->
<script>
// ✓ 代码分割 + 懒加载（webpack / vite）
// 路由级分割，首屏只加载当前路由代码
const HomePage = React.lazy(() => import('./pages/Home'));

// ✓ 预加载下一屏资源（用户悬停时触发）
link.addEventListener('mouseenter', () => {
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = '/next-page-bundle.js';
  document.head.appendChild(prefetch);
});
<\/script>`;

  const notes = [
    ruleBox('warning', `<strong>资源提示速查：</strong>
      <code>preload</code>（当前页必需，立即下载）、
      <code>prefetch</code>（下一页可能用到，低优先级后台下载）、
      <code>preconnect</code>（提前建立 TCP+TLS 连接）、
      <code>dns-prefetch</code>（仅 DNS 预解析，fallback）。
      不要滥用 preload，每个 preload 都占用带宽，首屏 preload 超过 5 个会适得其反。`),
    ruleBox('info', `<strong>SSR/SSG 首屏优化：</strong>Next.js 的 SSR 将首屏 HTML 在服务端生成，浏览器收到完整 HTML 后立即可以渲染，FCP 大幅提前。Hydration 阶段可用 <code>Suspense</code> + <code>streaming</code> 分段传输，让用户更快看到可交互内容。`),
    ruleBox('success', `<strong>测量工具：</strong>Chrome DevTools → Network → "Disable cache" + 模拟 3G，观察 Waterfall 图找出关键路径；Performance 面板查看 FCP/LCP 时间线；<code>performance.getEntriesByType('navigation')</code> 在代码中采集真实用户数据。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 阻塞首屏的常见错误', 'dot-red', 'html', badCode) + codeBlock('✓ 关键渲染路径优化', 'dot-green', 'html', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
