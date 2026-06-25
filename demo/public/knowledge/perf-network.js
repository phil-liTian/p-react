function renderPerfNetwork(t) {
  const question = ruleBox('info',
    `<strong>网络优化的目标：</strong>减少请求数量、减小传输体积、缩短关键资源到达时间。
    核心手段：<strong>缓存（Cache-Control / Service Worker）</strong>→ <strong>预加载（Preload / Prefetch）</strong>→ <strong>协议升级（HTTP/2 / HTTP/3）</strong>→ <strong>CDN 加速</strong>。
    先用 Network 面板 + WebPageTest 量化瓶颈，再针对性优化。`);

  const overview = `
    <table class="metrics-table">
      <thead><tr><th>手段</th><th>作用</th><th>适用资源</th></tr></thead>
      <tbody>
        <tr><td>Cache-Control 强缓存</td><td>复访零传输，命中率 95%+</td><td>带 hash 的 JS/CSS/图片</td></tr>
        <tr><td>ETag / Last-Modified 协商缓存</td><td>304 节省 body 传输</td><td>HTML、无 hash 的资源</td></tr>
        <tr><td>Resource Hints（preload/prefetch）</td><td>并行加载，消除渲染阻塞</td><td>关键字体、首屏图片、下一页资源</td></tr>
        <tr><td>HTTP/2 多路复用</td><td>消除 TCP 队头阻塞，并发请求无限制</td><td>所有静态资源</td></tr>
        <tr><td>CDN 就近分发</td><td>降低 RTT 50-200ms</td><td>所有公共静态资源</td></tr>
        <tr><td>Service Worker 离线缓存</td><td>离线可用，秒开体验</td><td>Shell 资源、API 响应</td></tr>
        <tr><td>图片格式优化（WebP/AVIF）</td><td>-30~70% 传输体积</td><td>位图（PNG/JPG）</td></tr>
      </tbody>
    </table>`;

  const cacheCode = `// ── HTTP 缓存策略 ─────────────────────────────────────────────────────────────

// Nginx 配置示例
//
// # 带 content hash 的静态资源：永久强缓存
// location ~* \\.(js|css|woff2|png|webp|avif)$ {
//   add_header Cache-Control "public, max-age=31536000, immutable";
//   # immutable 告诉浏览器内容永不变化，跳过 If-None-Match 请求
// }
//
// # HTML 文件：不缓存或极短缓存（因为 HTML 引用带 hash 的资源）
// location ~* \\.html$ {
//   add_header Cache-Control "no-cache";   # 每次协商验证
// }
//
// # API 响应：按业务决定缓存时长
// location /api/ {
//   add_header Cache-Control "private, max-age=0, must-revalidate";
// }

// ── Service Worker：Workbox 离线缓存 ──────────────────────────────────────────

// vite-plugin-pwa（推荐，零配置）
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Shell 资源：Cache First（优先走缓存，离线可用）
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
        runtimeCaching: [
          {
            // 图片：Cache First，缓存 30 天
            urlPattern: /\\.(?:png|jpg|jpeg|webp|avif|svg)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxAgeSeconds: 2592000 } },
          },
          {
            // API：Network First，网络失败时回退缓存
            urlPattern: /\\/api\\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
});`;

  const resourceHintsCode = `// ── Resource Hints：提前加载关键资源 ────────────────────────────────────────

// 1. preload：当前页面必用资源，提高优先级、消除渲染阻塞
// <link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin>
// <link rel="preload" href="/hero-image.webp" as="image">
// <link rel="preload" href="/critical.css" as="style">

// 2. prefetch：下一页可能用到的资源，空闲时预取
// <link rel="prefetch" href="/pages/dashboard.js">  // 登录后很可能去 Dashboard

// 3. preconnect：提前建立 TCP + TLS 连接（CDN、第三方 API）
// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link rel="preconnect" href="https://api.example.com">

// 4. DNS-prefetch：仅预解析 DNS（preconnect 的降级）
// <link rel="dns-prefetch" href="https://cdn.example.com">

// ── React Router 中路由预加载 ────────────────────────────────────────────────

import { lazy } from 'react';

// lazy 返回的组件自带 preload 能力
const Dashboard = lazy(() => import('./pages/Dashboard'));

// 鼠标悬停链接时预取（不等用户点击）
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const handleMouseEnter = () => {
    // 触发模块预加载，实际导航时直接命中缓存
    import('./pages/Dashboard');
  };
  return <a href={to} onMouseEnter={handleMouseEnter}>{children}</a>;
}`;

  const imageCode = `// ── 图片优化 ─────────────────────────────────────────────────────────────────

// 1. 现代格式：WebP / AVIF（浏览器按支持情况选择）
// <picture>
//   <source srcset="/hero.avif" type="image/avif">  <!-- 最优，-50% vs WebP -->
//   <source srcset="/hero.webp" type="image/webp">  <!-- 广泛支持 -->
//   <img src="/hero.jpg" alt="Hero" width="1200" height="600" loading="eager">
// </picture>

// 2. 响应式图片：按视口宽度下发合适尺寸
// <img
//   src="/product-400.webp"
//   srcset="/product-400.webp 400w, /product-800.webp 800w, /product-1200.webp 1200w"
//   sizes="(max-width: 600px) 400px, (max-width: 1024px) 800px, 1200px"
//   alt="Product"
// >

// 3. React 中使用 next/image（自动优化）
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority    // 首屏图：preload，不用 lazy
  placeholder="blur"
/>

// 4. 构建时自动转 WebP（vite-plugin-imagemin）
// vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';
export default defineConfig({
  plugins: [
    viteImagemin({
      webp: { quality: 82 },
      mozjpeg: { quality: 80 },
      svgo: { plugins: [{ name: 'preset-default' }] },
    }),
  ],
});`;

  const notes = [
    ruleBox('warning', `<strong>preload 滥用会适得其反：</strong>preload 会提高资源优先级并占用带宽。只对"当前页面关键路径上的资源"使用 preload：首屏 Hero 图、关键字体、above-the-fold CSS。滥用 preload 会把带宽分给低优资源，反而拖慢 LCP。`),
    ruleBox('info', `<strong>HTTP/2 下合并请求已非必要：</strong>HTTP/1.1 时代的"雪碧图 + 文件合并"在 HTTP/2 下可能是反优化——HTTP/2 多路复用下，小文件并行传输往往更快，且粒度细的 chunk 有更好的缓存命中率。确认服务器支持 HTTP/2 后，可以大胆做 Code Splitting。`),
    ruleBox('success', `<strong>量化网络性能的工具：</strong>① Chrome DevTools Network 面板（Waterfall 瀑布图找串行阻塞）；② WebPageTest.org（跨地域、真实网速测试）；③ Lighthouse（给出 preload/prefetch 具体建议）；④ <code>navigator.connection</code>（JS 获取用户网络类型，动态决定加载质量）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('优化手段总览', overview)}
    ${section('代码示例', codeBlock('HTTP 缓存策略 & Service Worker', 'dot-blue', 'javascript', cacheCode) + codeBlock('Resource Hints：preload / prefetch / preconnect', 'dot-green', 'html', resourceHintsCode) + codeBlock('图片现代格式与响应式优化', 'dot-cyan', 'javascript', imageCode))}
    ${section('延伸与注意事项', notes.join(''))}
  `);
}
