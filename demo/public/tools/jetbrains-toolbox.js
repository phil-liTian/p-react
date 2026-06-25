function renderJetbrainsToolbox(t) {
  const intro = ruleBox('info',
    `JetBrains Toolbox 是统一管理所有 JetBrains IDE 的桌面客户端。安装后可以一键安装/更新/回滚 IntelliJ IDEA、WebStorm、GoLand、PyCharm 等任意 IDE，告别手动下载安装包。`);

  const features = `
    <ul>
      <li><strong>版本管理</strong>：可同时安装同一 IDE 的多个版本，按项目需求切换，支持一键回滚到旧版本</li>
      <li><strong>自动更新</strong>：后台静默更新，也可配置"不自动更新"在手动确认后再升级</li>
      <li><strong>快速启动</strong>：从 Toolbox 直接打开最近项目，也可在菜单栏常驻图标快速访问</li>
      <li><strong>Shell 脚本</strong>：可生成 <code>idea</code>、<code>webstorm</code> 等命令行工具，支持 <code>idea .</code> 从终端打开当前目录</li>
      <li><strong>统一登录</strong>：一次登录 JetBrains 账号，所有 IDE 共享授权状态</li>
    </ul>`;

  const shellCmds = `# 安装 Toolbox 后，在 Settings → Shell scripts 中启用
# 之后可在终端直接打开项目

idea .           # 用 IntelliJ IDEA 打开当前目录
webstorm .       # 用 WebStorm 打开当前目录
goland .         # 用 GoLand 打开当前目录
pycharm .        # 用 PyCharm 打开当前目录`;

  const linkHtml = `<p>官网下载：<a href="${t.url}" target="_blank" rel="noopener" style="color:var(--blue)">${t.url}</a></p>`;

  return articleShell(t, `
    ${section('工具简介', intro)}
    ${section('核心功能', `<div class="section-body">${features}</div>`)}
    ${section('Shell 脚本（从终端打开 IDE）', codeBlock('terminal', 'dot-blue', 'bash', shellCmds))}
    ${section('下载地址', `<div class="section-body">${linkHtml}</div>`)}`);
}
