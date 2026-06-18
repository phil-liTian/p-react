function renderCcSwitch(t) {
  const usageCode = `# 查看当前使用的 profile
cc-switch current

# 列出所有已配置的 profile
cc-switch list

# 切换到指定 profile
cc-switch use <profile-name>

# 新增一个 profile（交互式，按提示输入 API Key 等）
cc-switch add <profile-name>

# 删除 profile
cc-switch remove <profile-name>`;

  const steps = `
    <ol class="step-list">
      <li><span class="step-num">01</span><span>安装：<code>npm i -g cc-switch</code></span></li>
      <li><span class="step-num">02</span><span>添加第一个 profile：<code>cc-switch add personal</code>（按提示输入 API Key）</span></li>
      <li><span class="step-num">03</span><span>添加第二个 profile：<code>cc-switch add work</code></span></li>
      <li><span class="step-num">04</span><span>切换：<code>cc-switch use work</code> → 后续 Claude Code 会话使用 work profile</span></li>
      <li><span class="step-num">05</span><span>确认当前 profile：<code>cc-switch current</code></span></li>
    </ol>`;

  const scenarios = [
    ruleBox('info', '<strong>个人 vs 公司账号：</strong>个人开发用 <code>personal</code> profile（个人 API Key），公司项目切到 <code>work</code> profile（公司统一 Key 或 AWS Bedrock 配置）。一条命令完成切换，无需手动改 ~/.claude 文件。'),
    ruleBox('success', '<strong>团队共享配置：</strong>可将 profile 配置导出为环境变量，通过 CI/CD 或 dotenv 注入，让 CI 环境与本地保持一致的 Claude 配置。'),
  ];

  return articleShell(t, `
    ${section('工具简介', `<p>${t.summary}</p>`)}
    ${section('安装与使用步骤', steps)}
    ${section('命令速查', codeBlock('cc-switch CLI', 'dot-yellow', 'bash', usageCode))}
    ${section('典型场景', scenarios.join(''))}`);
}
