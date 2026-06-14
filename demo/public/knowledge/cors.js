function renderCors(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>浏览器的<strong>同源策略（Same-Origin Policy）</strong>禁止脚本读取不同源的响应。
    CORS（跨源资源共享）通过 HTTP 头让服务端声明「允许哪些源访问」，是跨域的标准解决方案。
    <strong>简单请求</strong>直接发送，<strong>预检请求（Preflight）</strong>先发 OPTIONS 验证权限再发真实请求。`);

  const principle = `
    <p><strong>同源定义：</strong>协议 + 域名 + 端口三者完全相同才算同源。<code>http://a.com</code> 与 <code>https://a.com</code> 不同源（协议不同）；<code>a.com:80</code> 与 <code>a.com:8080</code> 不同源（端口不同）。</p>
    <p><strong>简单请求 vs 预检请求：</strong></p>
    <ul>
      <li><strong>简单请求</strong>（直接发）：方法为 GET/HEAD/POST 之一，且 Content-Type 仅限 <code>text/plain</code>/<code>multipart/form-data</code>/<code>application/x-www-form-urlencoded</code>，且无自定义请求头</li>
      <li><strong>预检请求</strong>（先 OPTIONS）：凡是 PUT/DELETE/PATCH、JSON body、自定义 Header（如 <code>Authorization</code>），都触发预检。浏览器先发 OPTIONS 询问服务端是否允许，通过后才发真实请求</li>
    </ul>
    <p><strong>关键响应头：</strong></p>
    <ul>
      <li><code>Access-Control-Allow-Origin: https://app.com</code>（或 <code>*</code>，但带 credentials 时不能用 <code>*</code>）</li>
      <li><code>Access-Control-Allow-Methods: GET, POST, PUT, DELETE</code></li>
      <li><code>Access-Control-Allow-Headers: Content-Type, Authorization</code></li>
      <li><code>Access-Control-Max-Age: 86400</code>：预检结果缓存时间（减少 OPTIONS 请求）</li>
      <li><code>Access-Control-Allow-Credentials: true</code>：允许携带 Cookie（前端需配合 <code>credentials: 'include'</code>）</li>
    </ul>`;

  const badCode = `// ✗ 常见 CORS 错误场景

// 错误 1：前端带 Cookie，服务端用通配符
// Access-Control-Allow-Origin: *          ← 与 credentials 不兼容，浏览器报错
// Access-Control-Allow-Credentials: true  ← 必须指定具体域名

// 错误 2：预检请求服务端没处理 OPTIONS，返回 404/405
app.post('/api/data', handler); // ← 忘了处理 OPTIONS /api/data

// 错误 3：前端 fetch 默认不带 Cookie
fetch('https://api.example.com/user');
// 响应里有 Set-Cookie，但浏览器不会存，因为 credentials 默认是 'same-origin'

// 错inx 反代时重复设置 CORS 头（应用服务器 + Nginx 各设一次）
// 浏览器收到两个 Access-Control-Allow-Origin 头，报错`;

  const goodCode = `// ✓ Node.js (Express) 正确配置 CORS
const allowedOrigins = ['https://app.com', 'https://admin.app.com'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // 动态设置，避免 *
    res.setHeader('Vary', 'Origin'); // 告知 CDN 按 Origin 分缓存
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 预检缓存 1 天

  // 预检请求直接返回 204，不走业务逻辑
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ✓ 前端带 Cookie 的跨域请求
fetch('https://api.example.com/user', {
  credentials: 'include', // 携带跨域 Cookie
  headers: { 'Content-Type': 'application/json' },
});

// ✓ 开发环境：用 Vite/webpack 代理，完全避免跨域
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,    // 修改 Host 头
        rewrite: path => path.replace(/^\\/api/, ''),
      },
    },
  },
};

// ✓ Nginx 反代配置（二选一：应用层处理 or Nginx 处理，不要同时）
// location /api/ {
//   proxy_pass http://backend;
//   add_header Access-Control-Allow-Origin $http_origin always;
//   add_header Access-Control-Allow-Credentials true always;
// }`;

  const notes = [
    ruleBox('warning', `<strong>CORS 只是浏览器的限制：</strong>服务端实际收到了所有请求（包括跨域的），CORS 只在浏览器端拦截响应。因此 CORS 不能防止服务端被直接调用（curl、Postman 不受限）。真正的安全防护要靠服务端验证 Token/Session。`),
    ruleBox('info', `<strong>其他跨域方案：</strong>① <strong>JSONP</strong>（利用 <code>&lt;script&gt;</code> 标签不受同源限制，仅支持 GET，已过时）；② <strong>postMessage</strong>（<code>iframe</code> 父子页面通信）；③ <strong>WebSocket</strong>（握手时有 Origin 头，但协议本身不受同源策略约束）；④ <strong>document.domain</strong>（仅适用于同主域不同子域，已从规范中废弃）。`),
    ruleBox('success', `<strong>调试技巧：</strong>Chrome DevTools → Network → 找到 OPTIONS 请求，检查响应头是否包含正确的 <code>Access-Control-Allow-*</code>；若请求直接失败没有 OPTIONS，说明是简单请求被拦截，检查响应中的 <code>Access-Control-Allow-Origin</code> 是否与请求的 <code>Origin</code> 匹配。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 常见 CORS 配置错误', 'dot-red', 'javascript', badCode) + codeBlock('✓ 服务端正确配置 + 前端 credentials', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
