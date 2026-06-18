function renderSwitchHosts(t) {
  const steps = `
    <ol class="step-list">
      <li><span class="step-num">01</span><span>下载安装：前往 <a href="https://github.com/oldj/SwitchHosts/releases" target="_blank" style="color:var(--blue)">GitHub Releases</a>，选择对应系统版本（macOS / Windows / Linux）</span></li>
      <li><span class="step-num">02</span><span>首次启动需授权修改系统 hosts 文件（macOS 会弹出密码确认）</span></li>
      <li><span class="step-num">03</span><span>在左侧面板新建"方案"，每个方案对应一套 hosts 配置</span></li>
      <li><span class="step-num">04</span><span>点击方案名左侧圆点即可启用/禁用，支持多套方案同时叠加生效</span></li>
      <li><span class="step-num">05</span><span>修改后无需手动刷新 DNS：SwitchHosts 会自动调用系统 DNS 刷新命令</span></li>
    </ol>`;

  const hostsExample = `# 本地开发环境
127.0.0.1  local.example.com
127.0.0.1  local-api.example.com

# 测试环境（Test）
10.0.1.100  www.example.com
10.0.1.100  api.example.com

# 预发布环境（Staging）
10.0.2.100  www.example.com
10.0.2.100  api.example.com`;

  const tips = [
    ruleBox('info', '<strong>多方案叠加：</strong>可同时启用多个方案，靠上的方案优先级更高。适合"基础配置 + 临时覆盖"组合使用。'),
    ruleBox('warning', '<strong>macOS 权限：</strong>系统 hosts 文件位于 <code>/etc/hosts</code>，需管理员权限写入。首次使用时建议选择"以管理员模式运行"，否则每次切换都需要输入密码。'),
    ruleBox('success', '<strong>配合 whistle：</strong>whistle 通过代理层拦截请求，SwitchHosts 直接修改 DNS 解析层。联调时可先用 SwitchHosts 将域名指向目标 IP，再用 whistle 拦截特定请求做 mock/修改。'),
    ruleBox('info', '<strong>远程方案：</strong>支持从远程 URL 加载 hosts 内容（如团队共享的 hosts 配置），定时自动同步，适合团队统一维护测试环境域名映射。'),
  ];

  return articleShell(t, `
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('安装与快速上手', steps)}
    ${section('hosts 配置示例', codeBlock('hosts 方案示例', 'dot-yellow', 'bash', hostsExample))}
    ${section('使用技巧', tips.join(''))}`);
}
