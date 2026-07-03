function renderClaudeCodeHooks(t) {
  const whatIsHtml = `
    <p>Hook 是 Claude Code 在特定事件触发时<strong>自动执行的 shell 命令</strong>，配置在 <code>settings.json</code> 里。它和 CLAUDE.md 的根本区别：CLAUDE.md 是给 Claude 看的自然语言提示（软约束，可能被忽略），Hook 是由 harness 直接执行的代码（硬约束，绕不过）。比如想阻止 Claude 修改 <code>.env</code>，写一百遍"不要改 .env"都不如一个 PreToolUse Hook 拦得住。</p>
    ${ruleBox('warning', '<strong>关键认知：</strong>Hook 由 harness（Claude Code 这个 CLI 程序本身）执行，不是 Claude 调用的。所以 Claude 想"绕过"也绕不过——它根本没机会接触被 Hook 拦截的工具调用。')}`;

  const eventTableHtml = compareCard([
    ['PreToolUse',        '工具调用前',  '拦截/改写命令，最常用。比如禁止 rm -rf、改 .env；或自动加 --no-verify 标志'],
    ['PostToolUse',       '工具调用后',  '编辑后自动跑 prettier、文件保存后跑相关测试、写完 SQL 自动格式化'],
    ['UserPromptSubmit',  '用户提交消息时', '在 prompt 进入 LLM 前注入额外上下文、记录到日志、或拦截危险指令'],
    ['Stop',              'Claude 主循环结束', '强制再跑一轮测试、检查是否有 TODO 没完成、提交前 lint'],
    ['SubagentStop',      '子 Agent 结束',  '对子 Agent 输出做后处理或审计'],
    ['Notification',      '提醒触发时',     '桌面通知、推送到手机、Slack/钉钉 webhook'],
    ['SessionStart',      '会话开始',       '注入项目动态信息（git status、当前任务、最近变更）到上下文'],
    ['SessionEnd',        '会话结束',       '清理临时文件、归档日志'],
    ['PreCompact',        '上下文压缩前',   '在压缩前保存关键信息，避免被摘要丢失'],
  ], ['事件', '触发时机', '典型用途']);

  const configLocationHtml = compareCard([
    ['用户级',     '~/.claude/settings.json',         '个人偏好，对所有项目生效'],
    ['项目级',     './.claude/settings.json',         '团队共享，提交至 Git'],
    ['本地级',     './.claude/settings.local.json',   '个人项目特定配置，加 .gitignore'],
    ['企业级',     '/etc/claude-code/...',             'IT/DevOps 下发的合规要求，不可被覆盖'],
  ], ['层级', '路径', '用途']);

  const configExampleHtml = `
    <p>最简单的 Hook：编辑任何文件后自动跑 Prettier。配置在 <code>.claude/settings.json</code>：</p>
    ${codeBlock('示例：PostToolUse 自动格式化', 'dot-cyan', 'json', `{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write \\"$CLAUDE_FILE_PATHS\\""
          }
        ]
      }
    ]
  }
}`)}
    <p><code>matcher</code> 用正则匹配工具名（如 <code>Edit|Write</code>、<code>Bash</code>），不写 matcher 表示对所有工具生效。环境变量 <code>$CLAUDE_FILE_PATHS</code> 由 harness 注入，包含本次操作涉及的文件路径。</p>`;

  const blockExampleHtml = `
    <p>拦截危险操作：禁止 Claude 执行 <code>rm -rf</code>、<code>git push --force</code>，禁止修改 <code>.env</code> 和 <code>migrations/</code>：</p>
    ${codeBlock('示例：PreToolUse 拦截危险命令', 'dot-purple', 'json', `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \\"$CLAUDE_TOOL_INPUT\\" | grep -qE 'rm -rf|git push --force' && { echo '危险命令被 Hook 拦截'; exit 2; } || exit 0"
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "echo \\"$CLAUDE_FILE_PATHS\\" | grep -qE '(^|\\\\s)(\\\\.env|migrations/)' && { echo '禁止修改敏感文件'; exit 2; } || exit 0"
          }
        ]
      }
    ]
  }
}`)}
    ${ruleBox('info', '<strong>退出码约定：</strong>exit 0 = 放行；exit 2 = 阻断并把 stderr 反馈给 Claude（它会换一种做法）；其他非零 = 静默阻断。这是 Hook 的核心控制信号。')}`;

  const useCasesHtml = cardGrid([
    { icon: '🎨',   title: '自动格式化',          body: 'PostToolUse + Edit/Write，调用 prettier / eslint --fix / gofmt。Claude 写完就格式化，不用人盯。' },
    { icon: '🛡',   title: '保护敏感文件',         body: 'PreToolUse 拦截 .env、CI 配置、migration 文件、生产密钥的修改。比 CLAUDE.md 的"请不要改"靠谱得多。' },
    { icon: '🚫',   title: '拦截危险命令',         body: 'PreToolUse + Bash，正则匹配 rm -rf、git push --force、drop table 等。exit 2 阻断并把原因反馈给 Claude。' },
    { icon: '🧪',   title: '提交前强制测试',       body: 'Stop 事件触发，跑全量测试，失败则 exit 2 阻止 Claude 收工，让它先修好测试。' },
    { icon: '📌',   title: '会话开始注入上下文',   body: 'SessionStart 时跑 git status / git log --oneline -10，把当前分支状态作为动态上下文喂给 Claude。' },
    { icon: '🔔',   title: '完成通知',             body: 'Notification / Stop 触发时调用 macOS osascript、Slack webhook，长任务跑完自动通知到手机。' },
    { icon: '📊',   title: '操作审计',             body: 'UserPromptSubmit / PreToolUse 把每次 prompt 和工具调用写入日志文件，事后可审计 Claude 做了什么。' },
    { icon: '🔄',   title: '工具链衔接',           body: 'PostToolUse 写完 SQL 自动跑 EXPLAIN；写完 API 自动生成 mock；让 Claude 与项目工具链形成闭环。' },
  ]);

  const compareOtherHtml = compareCard([
    ['CLAUDE.md',    '自然语言提示',  '软约束',  '会话开始加载', '记规则、踩坑、约定——希望 Claude 知道'],
    ['Hooks',        'shell 命令',    '硬约束',  '事件触发执行', '强制执行的规则——必须做或必须不做'],
    ['Slash Command','slash 调用',    '主动触发', '用户输入 /', '常用工作流一键调用，比如 /security-review'],
    ['Skills',       '指令块',        '按需加载',  '匹配场景调用', '可复用的工作模式，比如 /brainstorming'],
    ['Subagents',    '独立 Agent',    '委托执行',  'Claude 主动委派', '隔离上下文做研究/审查，结果回传主对话'],
  ], ['机制', '形式', '约束力', '触发方式', '适用场景']);

  const pitfallsHtml = cardGrid([
    { icon: '⚠️', title: 'Hook 失败阻塞所有操作', body: 'Hook 命令本身报错（比如 prettier 没装），会让 Claude 卡住。开发期先用 exit 0 兜底，验证通过后再加严。' },
    { icon: '⚠️', title: '正则写得太宽',           body: 'matcher 漏写或过宽会导致误伤。比如禁止 Edit 匹配 migrations/，正则没锚定，可能把测试文件也拦下。先在终端验证正则。' },
    { icon: '⚠️', title: '依赖环境变量未注入',     body: '$CLAUDE_FILE_PATHS、$CLAUDE_TOOL_INPUT 等环境变量在不同事件下可用性不同。查阅官方文档确认当前事件提供哪些变量，别写"我以为有"。' },
    { icon: '⚠️', title: '把可写成 CLAUDE.md 的塞进 Hook', body: 'Hook 适合做硬约束，不适合做"提醒"。想让 Claude 注意命名规范，写 CLAUDE.md 就够了——配 Hook 是过度工程。' },
    { icon: '⚠️', title: 'Hook 链太长拖慢响应',   body: '每个工具调用都串行跑 N 个 Hook，体感会变卡。Hook 内命令尽量短（< 1s），耗时任务用后台执行或只在 Stop 触发。' },
    { icon: '⚠️', title: '本地 Hook 没提交到 Git', body: '团队规范如果只在你的 settings.local.json 里，其他人享受不到。共享 Hook 要放 .claude/settings.json 并提交。' },
  ]);

  const debugTipsHtml = stepList([
    { title: '用 claude-code --debug 查看 Hook 执行', desc: '启动时加 --debug，会在终端打印每次 Hook 的触发、命令、stdout/stderr、退出码，排查问题第一步。' },
    { title: '先在终端单独跑 Hook 命令', desc: '把 command 字段抽出来，手动设环境变量跑一遍，验证逻辑正确再放进 settings.json。Hook 内 bug 比 Claude 行为 bug 更难定位。' },
    { title: '用 echo 调试注入的内容', desc: 'Hook 的 stdout 会被 harness 捕获并作为反馈传给 Claude。开发期用 echo "DEBUG: ..." 把中间状态打出来观察。' },
    { title: '善用 exit 2 而非 exit 1', desc: 'exit 2 会把 stderr 内容反馈给 Claude，它会知道为什么被拦并换思路；exit 1 是静默阻断，Claude 只知道失败了不知道为什么。' },
  ]);

  return articleShell(t, `
    ${section('什么是 Hook', whatIsHtml)}
    ${section('可用的事件类型', eventTableHtml)}
    ${section('配置文件放在哪里', configLocationHtml)}
    ${section('最小示例：编辑后自动格式化', configExampleHtml)}
    ${section('拦截危险操作的写法', blockExampleHtml)}
    ${section('典型用途（8 类）', useCasesHtml)}
    ${section('与 CLAUDE.md / Slash / Skill / Subagent 的区别', compareOtherHtml)}
    ${section('常见踩坑', pitfallsHtml)}
    ${section('调试技巧', debugTipsHtml)}
  `);
}
