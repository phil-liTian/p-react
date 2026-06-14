function renderAuthToken(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>四种鉴权方案各有适用场景：
    <strong>Cookie+Session</strong> 有状态、服务端存储，适合传统 Web；
    <strong>JWT</strong> 无状态、客户端存储，适合 API / 微服务；
    <strong>OAuth 2.0</strong> 用于第三方授权（「用微信登录」）；
    核心安全原则：<strong>Token 不存 localStorage</strong>（XSS 可窃取），敏感操作必须 HTTPS。`);

  const principle = `
    <p><strong>四种方案对比：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>方案</th><th>存储位置</th><th>服务端状态</th><th>适用场景</th><th>主要风险</th></tr></thead>
      <tbody>
        <tr><td>Cookie + Session</td><td>Cookie（sessionId） + 服务端 Session Store</td><td>有状态（需共享存储）</td><td>传统 Web、SSR 应用</td><td>CSRF</td></tr>
        <tr><td>JWT（Bearer Token）</td><td>内存 / HttpOnly Cookie / localStorage</td><td>无状态（自包含）</td><td>REST API、微服务、移动端</td><td>无法主动吊销</td></tr>
        <tr><td>OAuth 2.0</td><td>Authorization Server 颁发 Access Token</td><td>有状态（授权服务器）</td><td>第三方登录、开放平台</td><td>实现复杂</td></tr>
        <tr><td>API Key</td><td>请求头 / 查询参数</td><td>服务端验证</td><td>服务器间调用、开发者 API</td><td>泄露无法撤销</td></tr>
      </tbody>
    </table>
    <p><strong>JWT 结构：</strong><code>Header.Payload.Signature</code>（Base64Url 编码）</p>
    <ul>
      <li><strong>Header</strong>：算法类型，如 <code>{"alg":"HS256","typ":"JWT"}</code></li>
      <li><strong>Payload</strong>：声明（Claims），如 <code>{"sub":"123","exp":1700000000,"role":"admin"}</code>。<strong>Payload 未加密，不能存敏感信息</strong></li>
      <li><strong>Signature</strong>：<code>HMACSHA256(base64(header) + "." + base64(payload), secret)</code>，防篡改</li>
    </ul>`;

  const badCode = `// ✗ 常见安全错误

// 1. JWT 存 localStorage（XSS 可直接读取）
localStorage.setItem('token', jwt); // ← 危险

// 2. 过期时间设太长，无法吊销
const token = jwt.sign({ userId: 1 }, secret, { expiresIn: '365d' }); // ← 危险

// 3. Cookie 未设 HttpOnly（JS 可读取 sessionId）
res.cookie('sessionId', id); // ← 缺少 HttpOnly、Secure 标志

// 4. JWT 没有校验 alg，接受 alg:none 攻击
const decoded = jwt.decode(token); // decode 不验签！应用 verify
// 攻击者可构造 alg:none 的 token，绕过签名验证

// 5. Refresh Token 存 localStorage
localStorage.setItem('refreshToken', token); // ← 与 access token 同等危险`;

  const goodCode = `// ✓ 生产安全实践

// 服务端：正确设置 Cookie 标志
res.cookie('sessionId', sessionId, {
  httpOnly: true,    // JS 无法读取，防 XSS 窃取
  secure: true,      // 仅 HTTPS 传输
  sameSite: 'strict', // 防 CSRF（strict: 跨站请求不带 Cookie）
  maxAge: 7 * 24 * 3600 * 1000,
  path: '/',
});

// ✓ JWT：短过期 + Refresh Token 轮换策略
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' } // Access Token 短暂（15分钟）
);

const refreshToken = jwt.sign(
  { userId: user.id, tokenVersion: user.tokenVersion },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Refresh Token 存 HttpOnly Cookie，Access Token 存内存
res.cookie('refreshToken', refreshToken, {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/auth/refresh',
});

// 前端：Access Token 存内存（刷新页面自动用 Refresh Token 续期）
let accessToken = null; // 内存变量，不持久化

async function getAccessToken() {
  if (accessToken && !isExpired(accessToken)) return accessToken;
  // 调用静默续期接口
  const res = await fetch('/auth/refresh', { credentials: 'include' });
  const data = await res.json();
  accessToken = data.accessToken;
  return accessToken;
}

// ✓ JWT 验证必须用 verify，不能用 decode
try {
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'], // 明确指定算法，防止 alg:none 攻击
  });
} catch (err) {
  if (err.name === 'TokenExpiredError') return res.status(401).json({ code: 'TOKEN_EXPIRED' });
  return res.status(401).json({ code: 'INVALID_TOKEN' });
}`;

  const notes = [
    ruleBox('warning', `<strong>JWT 的核心缺陷：无法主动吊销。</strong>用户注销或修改密码后，已签发的 JWT 在过期前仍有效。解决方案：① 缩短过期时间（15min）+ Refresh Token 续期；② 维护 Token 黑名单（Redis 存储已吊销的 jti）；③ 在 Payload 中存 <code>tokenVersion</code>，修改密码时递增，服务端比对版本号。`),
    ruleBox('info', `<strong>SameSite Cookie 详解：</strong><code>strict</code>（完全禁止跨站携带，连从外部链接跳转也不带）、<code>lax</code>（GET 导航可携带，POST 跨站不带，Chrome 默认值）、<code>none</code>（必须配合 <code>Secure</code>，第三方 iframe / CORS 场景需要）。现代浏览器默认 <code>SameSite=Lax</code>，已能防御大多数 CSRF。`),
    ruleBox('success', `<strong>Token 续期最佳实践（Silent Refresh）：</strong>在 Access Token 过期前（如剩余 1 分钟）自动调用 <code>/auth/refresh</code>，用 HttpOnly Cookie 中的 Refresh Token 换新 Access Token。实现时可用 <code>axios</code> 拦截器：401 响应时自动续期，续期成功后重试原请求，避免用户感知到退登。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 常见鉴权安全错误', 'dot-red', 'javascript', badCode) + codeBlock('✓ 安全的 JWT + HttpOnly Cookie 实践', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
