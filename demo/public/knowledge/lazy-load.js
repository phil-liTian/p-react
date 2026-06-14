function renderLazyLoad(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>图片懒加载让首屏只下载视口内的图片，
    离屏图片在将要进入视口时才开始下载，大幅减少首屏请求数和流量。
    现代方案首选 <code>loading="lazy"</code>（原生，零 JS），
    精细控制用 <strong>IntersectionObserver API</strong>。`);

  const principle = `
    <p><strong>方案对比：</strong></p>
    <ul>
      <li><strong>原生 <code>loading="lazy"</code></strong>（Chrome 76+）：最简单，浏览器决定何时加载，无法自定义阈值。适合大多数场景。</li>
      <li><strong>IntersectionObserver</strong>：监听元素与视口的交叉状态，进入视口时将 <code>data-src</code> 赋值给 <code>src</code>，触发下载。可精确控制 <code>rootMargin</code>（提前加载距离）。</li>
      <li><strong>scroll 事件 + getBoundingClientRect</strong>（旧方案）：性能差，每次滚动都在主线程计算，已被 IntersectionObserver 完全取代。</li>
    </ul>
    <p><strong>IntersectionObserver 工作原理：</strong>浏览器在合成线程中异步检测交叉状态，<strong>不阻塞主线程</strong>，回调在主线程中以批量方式执行。
    <code>threshold: 0</code> 表示元素任意一像素进入视口时触发；<code>rootMargin: '200px'</code> 表示在元素距视口 200px 时提前触发。</p>`;

  const badCode = `<!-- ✗ 方案一：所有图片立即加载，阻塞首屏 -->
<img src="photo1.jpg" alt="">
<img src="photo2.jpg" alt="">
<!-- 100 张图片同时发起请求，带宽争抢，首屏 LCP 延迟 -->

<!-- ✗ 方案二：scroll 事件（性能差）-->
<script>
window.addEventListener('scroll', () => {
  // 每次滚动都触发，getBoundingClientRect 强制同步布局
  imgs.forEach(img => {
    const rect = img.getBoundingClientRect(); // 强制 Layout！
    if (rect.top < window.innerHeight) {
      img.src = img.dataset.src;
    }
  });
});
<\/script>`;

  const goodCode = `<!-- ✓ 方案一：原生 loading="lazy"（推荐，零成本）-->
<!-- 始终声明 width/height 防止 CLS -->
<img src="photo.jpg"
     loading="lazy"
     width="800" height="600"
     alt="Product photo">

<!-- ✓ 方案二：IntersectionObserver（需要精细控制时）-->
<!-- HTML：用 data-src 存真实地址，src 放占位图 -->
<img class="lazy"
     data-src="photo.jpg"
     src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
     width="800" height="600"
     alt="Product photo">

<script>
// IntersectionObserver 懒加载实现
function createLazyLoader(options = {}) {
  const {
    rootMargin = '200px 0px', // 提前 200px 开始加载
    threshold = 0.01,
  } = options;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img = entry.target;
      const src = img.dataset.src;
      if (!src) return;

      // 加载图片
      img.src = src;
      img.removeAttribute('data-src');

      // 加载成功后移除占位样式
      img.onload = () => img.classList.add('loaded');
      img.onerror = () => img.classList.add('error');

      // 已触发加载，停止观察该元素
      observer.unobserve(img);
    });
  }, { rootMargin, threshold });

  // 观察所有懒加载图片
  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));

  // 返回 observer 以便外部控制
  return observer;
}

const lazyLoader = createLazyLoader();

// 动态插入的图片需重新观察
function observeNewImages() {
  document.querySelectorAll('img[data-src]').forEach(img => lazyLoader.observe(img));
}
<\/script>

<style>
/* 图片加载前的占位样式，防止 CLS */
img.lazy {
  background: var(--bg-overlay);
  transition: opacity 0.3s;
  opacity: 0;
}
img.lazy.loaded { opacity: 1; }
img.lazy.error { background: #333; }
</style>`;

  const notes = [
    ruleBox('warning', `<strong>loading="lazy" 的限制：</strong>① 不适用于首屏图片（LCP 元素应设 <code>fetchpriority="high"</code> 而非 lazy）；② 图片必须有 <code>width/height</code> 或 CSS 尺寸，否则浏览器无法判断是否在视口内；③ 在 <code>&lt;iframe sandbox&gt;</code> 中不生效；④ Firefox 对 rootMargin 的实现与 Chrome 有细微差异。`),
    ruleBox('info', `<strong>背景图片懒加载：</strong>CSS <code>background-image</code> 不支持原生 lazy，需用 IntersectionObserver 在元素进入视口时动态添加 class，由 class 触发背景图样式。或使用 <code>&lt;img&gt;</code> + <code>object-fit: cover</code> 替代背景图。`),
    ruleBox('success', `<strong>与虚拟列表配合：</strong>虚拟列表中的图片无需懒加载（DOM 本身就只渲染可见行），但要注意 IntersectionObserver 观察的是 DOM 元素，虚拟列表复用 DOM 时需在每次数据更新后重新设置 <code>data-src</code>，或直接在 renderItem 中根据数据赋值 <code>src</code>。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 立即加载 / scroll 事件方案（错误）', 'dot-red', 'html', badCode) + codeBlock('✓ loading="lazy" + IntersectionObserver（推荐）', 'dot-green', 'html', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
