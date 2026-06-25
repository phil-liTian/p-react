function renderPerfRender(t) {
  const question = ruleBox('info',
    `<strong>渲染优化的目标：</strong>让浏览器更快完成从 HTML 到像素的流水线，核心指标是 LCP（最大内容绘制）和 CLS（布局偏移）。
    关键路径：<strong>消除渲染阻塞</strong>→ <strong>减少关键 CSS</strong>→ <strong>避免强制回流</strong>→ <strong>提升合成层独立渲染</strong>。
    用 Lighthouse 和 Chrome Performance 面板定位具体瓶颈，不要凭感觉优化。`);

  const overview = `
    <table class="metrics-table">
      <thead><tr><th>优化手段</th><th>改善指标</th><th>核心原理</th></tr></thead>
      <tbody>
        <tr><td>提取关键 CSS 内联</td><td>LCP、FCP</td><td>消除 CSS 文件下载阻塞首屏渲染</td></tr>
        <tr><td>async / defer 脚本</td><td>FCP、TTI</td><td>JS 不阻塞 HTML 解析</td></tr>
        <tr><td>字体预加载 + font-display</td><td>CLS、FCP</td><td>防止 FOUT/FOIT，避免字体换位偏移</td></tr>
        <tr><td>图片设置 width/height</td><td>CLS</td><td>浏览器提前预留空间，图片加载不触发回流</td></tr>
        <tr><td>减少重排（Reflow）</td><td>INP、FPS</td><td>批量读写 DOM，避免触发强制同步布局</td></tr>
        <tr><td>will-change / transform 提升合成层</td><td>动画 FPS</td><td>动画在 GPU 合成线程独立执行，不阻塞主线程</td></tr>
        <tr><td>content-visibility: auto</td><td>LCP、首次渲染</td><td>跳过屏幕外内容的布局和绘制</td></tr>
      </tbody>
    </table>`;

  const criticalCssCode = `// ── 关键 CSS 提取与内联 ───────────────────────────────────────────────────────

// 工具：critters（Google）自动提取关键 CSS 并内联
// Next.js 已内置；Vite 项目安装 vite-plugin-critters

// vite.config.ts
import { critters } from 'vite-plugin-critters';
export default defineConfig({
  plugins: [critters()],
  // 构建后自动将首屏所需 CSS 内联到 HTML <head>
  // 非关键 CSS 通过 <link rel="preload"> 异步加载
});

// 手动版（了解原理）
// 1. 首屏关键 CSS 直接写在 <style> 标签里
// 2. 完整 CSS 异步加载
// <link rel="preload" href="/full.css" as="style" onload="this.rel='stylesheet'">
// <noscript><link rel="stylesheet" href="/full.css"></noscript>

// ── async / defer 脚本加载策略 ────────────────────────────────────────────────

// defer：HTML 解析完成后按序执行（推荐用于应用主脚本）
// <script defer src="/app.js"></script>

// async：下载完立即执行，不保证顺序（适合独立的统计脚本）
// <script async src="/analytics.js"></script>

// type="module" 默认等同于 defer
// <script type="module" src="/main.js"></script>

// ── 字体优化 ─────────────────────────────────────────────────────────────────

// 1. 预加载 woff2
// <link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>

// 2. font-display：控制字体加载期间的展示行为
// @font-face {
//   font-family: 'Inter';
//   src: url('/fonts/Inter.woff2') format('woff2');
//   font-display: swap;   // 先用系统字体，字体加载完后替换（避免 FOIT 空白）
//   // optional：字体超时则放弃（CLS 最友好，但可能永远用系统字体）
// }

// 3. 字体子集化（只保留用到的字符）
// 工具：pyftsubset 或 Google Fonts API ?text=参数
// 中文字体从 3MB 压到 200KB 左右`;

  const reflowCode = `// ── 避免强制同步布局（Forced Synchronous Layout）────────────────────────────

// 强制同步布局：在 JS 中先写 DOM，再立即读布局属性，迫使浏览器提前计算布局
// 触发属性：offsetTop/Left/Width/Height, scrollTop, getBoundingClientRect()...

// ✗ 错误示例：循环中交替读写，每次迭代都触发一次 Reflow
function badResize(elements: HTMLElement[]) {
  elements.forEach(el => {
    const width = el.offsetWidth;     // 读：触发 Reflow
    el.style.height = width + 'px';  // 写：使布局失效，下次读再次 Reflow
  });
}

// ✓ 正确做法：批量读，批量写
function goodResize(elements: HTMLElement[]) {
  // 先批量读取，浏览器只计算一次布局
  const widths = elements.map(el => el.offsetWidth);
  // 再批量写入，触发一次布局
  elements.forEach((el, i) => {
    el.style.height = widths[i] + 'px';
  });
}

// ✓ 更好的方式：ResizeObserver（异步回调，在布局完成后执行）
const ro = new ResizeObserver(entries => {
  entries.forEach(entry => {
    const { width } = entry.contentRect; // 直接拿到新尺寸，无需读 DOM
    entry.target.style.height = width + 'px';
  });
});
elements.forEach(el => ro.observe(el));

// ── content-visibility：跳过屏幕外渲染 ──────────────────────────────────────

// CSS
// .article-card {
//   content-visibility: auto;
//   contain-intrinsic-size: 0 300px; // 预估高度，防止滚动条跳动
// }
//
// 效果：屏幕外的 .article-card 跳过 Layout + Paint，渲染时间 -40~70%
// 适用：文章列表、评论区、长页面中不在首屏的区块`;

  const compositeCode = `// ── 合成层优化：让动画脱离主线程 ────────────────────────────────────────────

// 触发合成层的属性（仅在 GPU 线程执行，不阻塞主线程）：
// - transform: translateZ(0) / translate3d
// - opacity（配合 transform）
// - will-change: transform | opacity
// - filter

// ✓ 高性能动画：只用 transform + opacity
// .slide-in {
//   transform: translateX(-100%);
//   transition: transform 300ms ease-out;  // ✓ GPU 执行
// }
// .slide-in.active {
//   transform: translateX(0);
// }

// ✗ 低性能动画：修改触发布局的属性
// .bad-animate {
//   transition: left 300ms;    // ✗ 触发 Reflow
//   transition: width 300ms;   // ✗ 触发 Reflow
//   transition: top 300ms;     // ✗ 触发 Reflow
// }

// will-change：提前提升合成层（谨慎使用，有内存开销）
// .animated-card {
//   will-change: transform;   // 告诉浏览器"这个元素将要动"，提前创建合成层
// }
// 注意：动画结束后应移除 will-change，避免长期占用 GPU 内存
// el.addEventListener('animationend', () => { el.style.willChange = 'auto'; });

// ── React 中避免不必要的渲染 ─────────────────────────────────────────────────

import { memo, useMemo, useCallback } from 'react';

// 1. React.memo：props 没变不重渲染
const ExpensiveChart = memo(({ data }: { data: DataPoint[] }) => {
  return <Chart data={data} />;
});

// 2. useMemo：缓存计算结果
function Dashboard({ records }: { records: Record[] }) {
  const stats = useMemo(
    () => records.reduce((acc, r) => ({ ...acc, total: acc.total + r.value }), { total: 0 }),
    [records] // records 引用不变时跳过计算
  );
  return <StatsCard value={stats.total} />;
}

// 3. useCallback：缓存函数引用（配合 memo 使用才有意义）
function Parent() {
  const handleClick = useCallback(() => { /* ... */ }, []); // 引用稳定
  return <ExpensiveChild onClick={handleClick} />;
}`;

  const notes = [
    ruleBox('warning', `<strong>will-change 是双刃剑：</strong>提前提升合成层会占用 GPU 显存。对所有元素加 <code>will-change: transform</code> 反而会让低端设备 OOM（内存溢出）。只对"正在动画的元素"临时添加，动画结束后移除。可用 DevTools Layers 面板查看合成层数量，超过 100 个通常是问题。`),
    ruleBox('info', `<strong>CLS 排查清单：</strong>① 图片无 width/height 属性；② 动态注入的广告/Banner 推挤内容；③ 字体切换（FOUT）导致文字位移；④ 服务端和客户端渲染结果不一致（Hydration 偏移）。Chrome DevTools Performance 面板中"Layout Shift"事件会标出每次偏移的元素。`),
    ruleBox('success', `<strong>渲染优化的度量工具：</strong>① Lighthouse（给出 LCP/CLS/TBT 分数和具体建议）；② Chrome Performance 面板（帧率、Long Task、强制回流定位）；③ DevTools Rendering → Paint Flashing（绿色高亮重绘区域）；④ PerformanceObserver API（线上采集真实用户 LCP/CLS 数据）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('优化手段总览', overview)}
    ${section('代码示例', codeBlock('关键 CSS 内联 & 脚本加载 & 字体优化', 'dot-blue', 'javascript', criticalCssCode) + codeBlock('避免强制回流 & content-visibility', 'dot-yellow', 'javascript', reflowCode) + codeBlock('合成层动画 & React 渲染优化', 'dot-green', 'javascript', compositeCode))}
    ${section('延伸与注意事项', notes.join(''))}
  `);
}
