function renderCookieSync(t) {
  const installCode = `# 方式一：Chrome 应用商店（推荐）
# 访问应用商店安装，安装后在扩展栏出现图标
# https://chromewebstore.google.com/detail/cookie-sync-assistant/agpegklbpdijjppfejcbiklfihbjkcbp

# 方式二：固定到工具栏
# 安装后点击 Chrome 扩展栏的拼图图标 → 给 Cookie Sync Assistant 打上 📌 固定`;

  const usageCode = `# 典型工作流：把生产环境的登录态同步到 localhost
1. 在浏览器正常登录 https://example.com（生产环境）
2. 点击扩展图标，配置同步规则：
   - 源域名：example.com
   - 目标域名：localhost / 127.0.0.1
3. 开启实时同步 → 扩展自动把 example.com 的 Cookie 写入 localhost
4. 打开 http://localhost:3000，本地服务自动复用生产会话
5. 长时间调试时开启"自动刷新"，防止会话过期`;

  const scenarioTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">场景</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">Cookie Sync 的价值</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['本地开发需要登录态', '把线上 session 同步到 localhost，免去本地 mock 登录'],
          ['联调线上 API', '本地代码直接请求需要鉴权的接口，Cookie 自动带上'],
          ['长时间调试会话', '自动刷新 Cookie，防止调试中断时 session 过期'],
          ['多环境切换', '无需手动从 DevTools 复制粘贴 Cookie'],
          ['会话一致性要求高的场景', '保证本地与线上一致的登录状态，避免诡异 bug'],
        ].map(([scene, value]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;color:var(--text-secondary)">${scene}</td>
            <td style="padding:8px 10px;color:var(--text-muted)">${value}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const notes = [
    ruleBox('warning', '<strong>仅限本地开发使用：</strong>同步生产 Cookie 到本地意味着本地服务拥有了线上会话权限。生产环境 Cookie 含敏感信息，<strong>不要</strong>把 Cookie 同步到任何非本地或非可信域名，避免泄露。'),
    ruleBox('success', '<strong>隐私安全：</strong>开发者声明该扩展不收集用户数据、不连接任何第三方服务器，所有同步操作在本地完成。源站 Cookie 仅在本地浏览器内流转。'),
    ruleBox('info', '<strong>替代手动方案：</strong>传统做法是从 DevTools → Application → Cookies 复制 Cookie，再粘贴到本地环境配置或手动写入。该扩展把这套流程自动化，省去反复复制粘贴。'),
    ruleBox('info', '<strong>支持多语言：</strong>支持中文（简/繁）、英语、西班牙语、法语、日语 6 种语言。版本 1.0.2，开发者 zystudios。'),
  ];

  return articleShell(t, `
    ${section('是什么', `<p>${t.summary}</p>`)}
    ${section('安装', codeBlock('安装步骤', 'dot-green', 'bash', installCode))}
    ${section('使用流程', codeBlock('典型工作流', 'dot-cyan', 'bash', usageCode))}
    ${section('应用场景', scenarioTable)}
    ${section('注意事项', notes.join(''))}`);
}
