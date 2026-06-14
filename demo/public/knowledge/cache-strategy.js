function renderCacheStrategy(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>浏览器缓存分两类：
    <strong>强缓存</strong>（<code>Cache-Control: max-age</code> / <code>Expires</code>）命中时直接读本地，不发请求（200 from cache）；
    <strong>协商缓存</strong>（<code>ETag</code> / <code>Last-Modified</code>）命中时服务端返回 304，不传响应体。
    正确组合两者可同时获得「零延迟」和「实时更新」。`);

  const principle = `
    <p><strong>缓存决策流程：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li>浏览器发起请求，先检查本地缓存</li>
      <li><strong>强缓存有效</strong>（<code>max-age</code> 未过期）→ 直接返回本地资源，<strong>不发网络请求</strong>，状态码 <code>200 (from disk cache)</code></li>
      <li>强缓存失效 → 发请求，携带 <code>If-None-Match: &lt;etag&gt;</code> 或 <code>If-Modified-Since: &lt;date&gt;</code></li>
      <li><strong>协商缓存命中</strong>（资源未变）→ 服务端返回 <code>304 Not Modified</code>，响应体为空，浏览器继续用本地缓存</li>
      <li>协商缓存未命中 → 服务端返回完整 <code>200</code> 响应体 + 新缓存头</li>
    </ol>
    <p><strong>关键响应头速查：</strong></p>
    <ul>
      <li><code>Cache-Control: max-age=31536000, immutable</code>：强缓存 1 年，资源不变（用于内容哈希文件名）</li>
      <li><code>Cache-Control: no-cache</code>：<strong>不跳过请求</strong>，每次都做协商缓存校验（≠ no-store）</li>
      <li><code>Cache-Control: no-store</code>：完全不缓存，每次下载完整响应（敏感数据用）</li>
      <li><code>Cache-Control: private</code>：仅浏览器缓存，CDN/代理不缓存（用于个人化内容）</li>
      <li><code>ETag</code>：资源内容的哈希指纹，精确但需服务端计算</li>
      <li><code>Last-Modified</code>：资源最后修改时间，精度为秒（1 秒内多次修改无法区分）</li>
    </ul>`;

  const badCode = `# ✗ 常见配置错误

# 错误 1：HTML 入口文件被强缓存（导致更新后用户看不到新版本）
Cache-Control: max-age=86400   # HTML 被缓存 1 天，JS/CSS 更新用户看不到

# 错误 2：带哈希的静态资源未设长缓存（浪费带宽）
# /static/app.a1b2c3d4.js
Cache-Control: no-cache        # 每次都请求，即使哈希未变

# 错误 3：API 接口返回 no-cache 但没有 ETag（协商缓存无效）
# 没有 ETag 或 Last-Modified，304 永远不会出现，每次全量返回

# 错误 4：混淆 no-cache 和 no-store
Cache-Control: no-cache        # 不是"不缓存"，是"每次都要校验"
Cache-Control: no-store        # 才是真正的"不缓存任何内容"`;

  const goodCode = `# ✓ 最佳实践配置

# HTML 入口文件：协商缓存（保证每次都能获取最新入口）
Cache-Control: no-cache
ETag: "abc123"

# 带内容哈希的 JS/CSS（文件名含哈希，内容变则名称变）
# /static/app.a1b2c3d4.js
Cache-Control: max-age=31536000, immutable
# immutable 告诉浏览器：缓存期内不需要做协商验证，彻底省去请求

# 图片/字体等静态资源（无哈希，但变化不频繁）
Cache-Control: max-age=604800, stale-while-revalidate=86400
# stale-while-revalidate：允许使用过期缓存，同时在后台重新验证

# API 接口：根据数据敏感度选择
Cache-Control: private, no-cache   # 个人化数据，协商缓存
Cache-Control: public, max-age=60  # 公共列表数据，60 秒强缓存
Cache-Control: no-store            # 支付/密码等敏感数据，不缓存

# Service Worker 策略示例（更精细的控制）
// sw.js
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // HTML：Network First（优先网络，网络失败用缓存）
  if (url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => { cache.put(event.request, res.clone()); return res; })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 带哈希的 JS/CSS：Cache First（永远用缓存）
  if (url.pathname.match(/\\.([a-f0-9]{8})\\.(js|css)$/)) {
    event.respondWith(
      caches.match(event.request) ||
      fetch(event.request).then(res => { cache.put(event.request, res.clone()); return res; })
    );
  }
});`;

  const notes = [
    ruleBox('warning', `<strong>Vary 头的陷阱：</strong><code>Vary: Accept-Encoding</code> 让缓存按编码方式（gzip/br）分开存储，是正确的；但 <code>Vary: User-Agent</code> 会为每个 UA 存一份缓存，导致 CDN 命中率极低。移动端适配优先用 <code>&lt;picture&gt;</code> 或 CSS 媒体查询，而不是用 Vary: User-Agent 分发不同 HTML。`),
    ruleBox('info', `<strong>ETag vs Last-Modified：</strong>同时存在时，ETag 优先级更高（更精确）。若服务端使用文件 mtime 生成 ETag，要注意集群部署时不同机器的 mtime 可能不同，导致同一资源每台机器的 ETag 不一致，缓存失效。应使用内容哈希生成 ETag。`),
    ruleBox('success', `<strong>Nginx 配置快速参考：</strong>
      <code>location ~* \\.(js|css)$ { add_header Cache-Control "max-age=31536000, immutable"; }</code>
      <code>location = /index.html { add_header Cache-Control "no-cache"; }</code>
      在 Vite/webpack 中开启 <code>output.filename: '[name].[contenthash].js'</code> 配合长缓存，是生产环境的标准配置。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 常见缓存配置错误', 'dot-red', 'nginx', badCode) + codeBlock('✓ 最佳实践：分层缓存策略', 'dot-green', 'nginx', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
