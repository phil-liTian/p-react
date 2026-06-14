function renderWebVitals(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Google 将 Web Vitals 定为搜索排名因素。核心三项：
    <strong>LCP</strong>（最大内容绘制，衡量加载速度）、
    <strong>CLS</strong>（累积布局偏移，衡量视觉稳定性）、
    <strong>INP</strong>（交互到下一帧绘制，2024 年取代 FID，衡量响应速度）。
    优秀阈值：LCP &lt; 2.5s、CLS &lt; 0.1、INP &lt; 200ms。`);

  const metricsTable = `
    <table class="metrics-table">
      <thead>
        <tr>
          <th>指标</th>
          <th>全称</th>
          <th>衡量什么</th>
          <th>优秀 / 需改进 / 差</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>LCP</td>
          <td>Largest Contentful Paint</td>
          <td>视口内最大内容元素（图片/文本块）完成渲染的时间，代表用户「感知加载完成」的时刻</td>
          <td>&lt; 2.5s / 2.5-4s / &gt; 4s</td>
        </tr>
        <tr>
          <td>CLS</td>
          <td>Cumulative Layout Shift</td>
          <td>页面生命周期内所有意外布局偏移分数之和。图片无尺寸、异步注入内容都会导致 CLS 升高</td>
          <td>&lt; 0.1 / 0.1-0.25 / &gt; 0.25</td>
        </tr>
        <tr>
          <td>INP</td>
          <td>Interaction to Next Paint</td>
          <td>用户交互（点击/键盘/触摸）到下一帧渲染完成的延迟，取所有交互的第 98 百分位值</td>
          <td>&lt; 200ms / 200-500ms / &gt; 500ms</td>
        </tr>
        <tr>
          <td>FCP</td>
          <td>First Contentful Paint</td>
          <td>首次渲染任意内容（文字/图片/SVG）的时间，辅助指标，非核心</td>
          <td>&lt; 1.8s / 1.8-3s / &gt; 3s</td>
        </tr>
        <tr>
          <td>TTFB</td>
          <td>Time to First Byte</td>
          <td>从请求发出到收到第一个字节的时间，反映服务端响应速度，影响所有后续指标</td>
          <td>&lt; 800ms / 800ms-1.8s / &gt; 1.8s</td>
        </tr>
      </tbody>
    </table>`;

  const measureCode = `// 使用官方 web-vitals 库采集（推荐）
import { onLCP, onCLS, onINP } from 'web-vitals';

onLCP(metric => {
  console.log('LCP:', metric.value, 'ms');
  // metric.entries 包含触发 LCP 的具体元素
  sendToAnalytics({ name: 'LCP', value: metric.value });
});

onCLS(metric => {
  console.log('CLS:', metric.value);
  // metric.entries 列出每次布局偏移的来源元素
});

onINP(metric => {
  console.log('INP:', metric.value, 'ms');
  // metric.entries[0].target 指向触发交互的 DOM 元素
});`;

  const optimizeCode = `// ── 优化 LCP ──────────────────────────────────────────────────────
// ✗ 关键图片未 preload，LCP 元素等待发现后才开始下载
// ✓ 在 <head> 中预加载 LCP 元素
// <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

// ✓ 给 LCP 图片设置高优先级（Chrome 102+）
const heroImg = document.querySelector('.hero-image');
heroImg.fetchPriority = 'high';

// ── 优化 CLS ──────────────────────────────────────────────────────
// ✗ 图片无尺寸，加载后撑开布局
// <img src="photo.jpg">

// ✓ 始终为图片/视频指定 width 和 height，或用 aspect-ratio 占位
// <img src="photo.jpg" width="800" height="600">
// CSS: img { aspect-ratio: 4/3; width: 100%; }

// ✓ 动态内容（广告、异步组件）使用固定高度容器占位
// .ad-slot { min-height: 250px; } /* 防止广告加载后推移内容 */

// ── 优化 INP ──────────────────────────────────────────────────────
// ✗ 点击事件处理器中有大量同步计算，阻塞主线程
button.addEventListener('click', () => {
  heavyComputation(); // 阻塞主线程 > 200ms
  updateDOM();
});

// ✓ 将耗时工作推迟到 scheduler 或 Web Worker
button.addEventListener('click', () => {
  updateDOMImmediately(); // 先响应视觉反馈
  scheduler.postTask(() => heavyComputation(), { priority: 'background' });
});`;

  const notes = [
    ruleBox('warning', `<strong>LCP 常见元凶：</strong>未压缩的大图（用 WebP/AVIF）、render-blocking 的 CSS/字体（用 <code>font-display: swap</code>）、服务端响应慢（用 CDN + Edge Cache）、未预加载的关键资源（用 <code>&lt;link rel="preload"&gt;</code>）。`),
    ruleBox('info', `<strong>CLS 隐形来源：</strong>Web 字体的 FOUT（无样式文本闪烁）会导致文本重排，引发 CLS。解决方案：<code>font-display: optional</code>（完全避免重排）或 <code>size-adjust</code> + <code>ascent-override</code> 让备用字体尺寸与 Web 字体一致。`),
    ruleBox('success', `<strong>测量工具：</strong>① Chrome DevTools → Lighthouse（实验室数据）；② PageSpeed Insights（实际用户数据 + 实验室数据）；③ Search Console → Core Web Vitals 报告（28天真实用户聚合）；④ <code>web-vitals</code> npm 包（自采集上报到自有监控平台）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析 — 五大指标速览', metricsTable)}
    ${section('代码示例', codeBlock('采集 Web Vitals', 'dot-blue', 'javascript', measureCode) + codeBlock('✓ 优化 LCP / CLS / INP', 'dot-green', 'javascript', optimizeCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
