function renderWebAccess(t) {
  const installCode = `# 1. 安装 Anchor Browser MCP（需要 Node.js 18+）
npx @anthropic-ai/claude-code mcp add anchor-browser

# 2. 或在 .claude/settings.json 中手动配置
# "mcpServers": { "anchor-browser": { ... } }`;

  const usageExamples = `# 搜索信息
/web-access 搜索 React 19 concurrent features 最新动态

# 抓取网页内容
/web-access 读取 https://react.dev/blog/2024/12/05/react-19

# 需要登录的页面（使用真实浏览器环境）
/web-access 抓取我的 GitHub issues 列表

# 小红书 / 微博等动态渲染页面
/web-access 搜索小红书上关于 Claude Code 的使用技巧`;

  const triggerTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">触发场景</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">示例 prompt</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">底层工具</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['搜索最新信息', '"搜索 Vite 6 changelog"', 'Anchor Browser MCP / WebSearch'],
          ['抓取静态页面', '"读取这个文档页面的内容"', 'WebFetch'],
          ['动态渲染页面', '"打开这个 SPA 页面并截图"', 'Anchor Browser MCP'],
          ['需要登录的站点', '"查看我的 Jira 任务列表"', 'Anchor Browser MCP（真实浏览器）'],
          ['社交媒体内容', '"搜索小红书上的 Claude 使用技巧"', 'Anchor Browser MCP'],
          ['网页自动化操作', '"填写这个表单并提交"', 'Anchor Browser MCP'],
        ].map(([scene, example, tool]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;color:var(--text-secondary)">${scene}</td>
            <td style="padding:8px 10px;font-family:var(--font-code);font-size:11.5px;color:var(--accent-light)">${example}</td>
            <td style="padding:8px 10px;color:var(--text-muted)">${tool}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const notes = [
    ruleBox('warning', '<strong>所有联网操作必须通过 <code>/web-access</code> skill，不要直接用 WebFetch。</strong>WebFetch 对已认证服务（GitHub、Confluence、Jira、小红书）会失败；web-access skill 会自动判断场景，优先调用 Anchor Browser MCP 处理需要真实浏览器的情况。'),
    ruleBox('info', '<strong>Anchor Browser MCP 启动的是真实 Chromium 实例，支持 JavaScript 渲染和 Cookie 会话。</strong>静态页面用 WebFetch 更快；动态渲染、需要登录、需要截图的场景才用 Anchor Browser MCP。skill 内部会自动路由，无需手动区分。'),
    ruleBox('success', '<strong>搜索操作仅在美国区域可用（WebSearch 工具限制）。</strong>如果搜索无结果或报错，先确认网络环境；抓取已知 URL 则无地区限制。'),
  ];

  return articleShell(t, `
    ${section('是什么', `<p>${t.summary}</p>`)}
    ${section('安装配置', codeBlock('安装步骤', 'dot-cyan', 'bash', installCode))}
    ${section('使用方式', codeBlock('调用示例', 'dot-yellow', 'bash', usageExamples))}
    ${section('触发场景速查', triggerTable)}
    ${section('注意事项', notes.join(''))}
  `);
}
