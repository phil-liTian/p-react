function renderCcGui(t) {
  const installCode = `# 方式一：JetBrains 插件市场（推荐）
# Settings → Plugins → 搜索 "CC GUI" → Install → 重启 IDE
# 插件主页：https://plugins.jetbrains.com/plugin/29342-cc-gui-claude-or-codex-

# 方式二：下载 Release 包安装
# 下载地址：https://github.com/zhukunpenglinyutong/desktop-cc-gui/releases
# 下载 zip 包后在 IDEA → Settings → Plugins → ⚙ → Install Plugin from Disk 选择本地 zip

# 方式三：本地构建（开发调试）
git clone https://github.com/zhukunpenglinyutong/jetbrains-cc-gui
cd jetbrains-cc-gui
cd webview && npm install      # 前端依赖
cd ../ai-bridge && npm install # ai-bridge 依赖
cd ..
./gradlew clean runIde         # 调试运行
./gradlew clean buildPlugin    # 构建产物在 build/distributions/（约 40MB）`;

  const providerCode = `# CC GUI 支持的认证方式（Settings → Provider 配置）
1. Claude.ai OAuth 登录          # 通过 Claude.ai 账户授权
2. Anthropic API Key             # 来自 Anthropic Console，按用量计费
3. 复用 Claude Code CLI 登录态    # 直接复用 ~/.claude 已有登录
4. 导入本地 Provider 配置         # 从 settings.json 导入
5. 导入 cc-switch 配置            # 兼容社区 cc-switch profile
6. 第三方代理端点                 # 自定义 endpoint（兼容性由代理决定）

# Codex 侧支持：ChatGPT 登录 / API Key`;

  const usageCode = `# 在右侧面板直接对话
帮我重构 @src/utils/format.ts，把重复的日期解析逻辑抽成独立函数

# 使用 @file 引用文件，支持图片输入
参考 @src/components/UserCard.tsx 的设计，新增 @src/components/OrderCard.tsx

# 调用 Skill（斜杠命令）
/java-coding-standards 检查一下 @infrastructure 下的代码
/simplify                          # 让 AI 审查并简化最近改动
/init                              # 初始化项目 CLAUDE.md`;

  const featureTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">类别</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">功能</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">说明</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['双 AI 引擎', 'Claude Code + Codex', '同一面板切换，按需使用 Anthropic 或 OpenAI'],
          ['智能对话', '@file 引用 / 图片输入', '上下文感知，对话可回溯'],
          ['Agent 系统', 'Agent + Skills + MCP', '内置 /init、/review、/simplify 等斜杠命令，支持 MCP 扩展'],
          ['开发者体验', '权限管理 + Diff 对比', '代码改动直接在 IDE 内展示 Diff，支持文件跳转'],
          ['会话管理', '历史 / 收藏 / 导出', '搜索历史会话，导出消息内容'],
          ['使用统计', 'Token + 费用分析', '查看用量趋势，多 Provider 切换'],
          ['Commit AI', 'AI 生成提交信息', '基于改动自动生成 commit message'],
          ['国际化', '中英文 + 主题', '深色/浅色主题、字体缩放同步'],
        ].map(([cat, feat, desc]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;color:var(--text-secondary)">${cat}</td>
            <td style="padding:8px 10px;font-family:var(--font-code);font-size:11.5px;color:var(--accent-light)">${feat}</td>
            <td style="padding:8px 10px;color:var(--text-muted)">${desc}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const notes = [
    ruleBox('warning', '<strong>IDEA 2026.1 黑屏问题：</strong>部分用户打开面板出现黑屏，先清除 IDE 内置浏览器缓存；无效则在 <code>Help → Edit Custom VM Options</code> 添加：<code>-Dide.browser.jcef.out-of-process.enabled=false</code> 和 <code>-Dide.browser.jcef.gpu.disable=true</code>，重启 IDEA。该 workaround 关联 Issue 截至当前版本仍未关闭。'),
    ruleBox('info', '<strong>GUI ≠ CLI 完整能力：</strong>CC GUI 是 Claude Code CLI 的可视化壳，<strong>不保证继承 CLI 的全部能力</strong>。需要 CLI 独有特性（如特定 hook、复杂管道）时仍要用命令行。'),
    ruleBox('success', '<strong>与 JetBrains ACP 路线不冲突：</strong>ACP 复用 IDE 内置 AI Chat / Diff 能力，CC GUI 通过独立插件提供会话管理、图片输入、Agent、MCP 等 GUI 能力。两者按偏好选择，可共存。'),
    ruleBox('info', '<strong>与 Qoder 区别：</strong>CC GUI 是 Claude Code/Codex 的 GUI 壳（开源、MIT），Qoder 是独立的 AI 编程 Agent（闭源、阿里出品）。CC GUI 对 Java 通用支持，Qoder 对 Java 生态优化更深入。'),
    ruleBox('warning', '<strong>Skill 一致性局限：</strong>Skill 能提高检查口径的一致性，但不同模型、不同上下文下结果不会完全一致。团队标准仍应落在可版本化的规则、静态检查和 Review 流程里，不要把 Skill 当作唯一质量门。'),
  ];

  return articleShell(t, `
    ${section('是什么', `<p>${t.summary}</p><p style="margin-top:8px">项目原名 Claude Code GUI，因商标风险更名为 CC GUI（Claude or Codex）。通过 <code>ai-bridge</code> 模块与 Claude Code 通信，开发者无需直接操作命令行即可在 IDE 内使用 AI 编程辅助。开源协议 MIT。</p>`)}
    ${section('安装', codeBlock('安装步骤', 'dot-green', 'bash', installCode))}
    ${section('Provider 配置', codeBlock('认证方式', 'dot-yellow', 'bash', providerCode))}
    ${section('使用示例', codeBlock('对话与 Skill', 'dot-cyan', 'bash', usageCode))}
    ${section('核心功能速查', featureTable)}
    ${section('注意事项', notes.join(''))}`);
}
