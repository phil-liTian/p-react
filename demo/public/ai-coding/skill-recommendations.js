function renderSkillRecommendations(t) {

  // ── Superpower ──────────────────────────────────────────────────────────────

  const superpowerIntroHtml = `
    <p>Skill 是 Claude Code 中可复用的上下文指令块，用 <code>/skill-name</code> 一句话调用。Superpower 类 Skill 的特点是：<strong>一次调用，效果远超反复手写 Prompt</strong>。它们把经验结晶成可复用的工作模式，而不是每次对话都从头解释规则。</p>
    ${ruleBox('accent', `<strong>核心价值：</strong>好的 Skill 是乘法器——让 AI 第一轮就知道"这个项目的规则"，而不是第 N 轮才对齐。`)}`;

  const superpowerSkillsHtml = `
    ${cardGrid([
      {
        icon: '🧠',
        title: '/brainstorming',
        body: '任何创意工作前强制调用。探索用户意图和设计方向，不急着实现，先把选项摊开来比较。避免"AI 猜你想要什么"导致的方向跑偏。',
      },
      {
        icon: '📋',
        title: '/spec-driven',
        body: '自动触发 Spec 写作流程：从需求到接口定义、验收标准、Out of Scope，输出一份可直接喂给 AI 执行的 Spec 草稿。',
      },
      {
        icon: '🔍',
        title: '/code-review-excellence',
        body: '多语言深度 Code Review。不只看格式命名，重点关注边界 case、安全隐患、可维护性。比口头说"帮我 Review"质量高一个数量级。',
      },
      {
        icon: '🛡',
        title: '/security-review',
        body: '专项安全审查。扫描当前分支改动，检查 OWASP Top 10、注入风险、敏感数据暴露。上线前必过。',
      },
      {
        icon: '🏗',
        title: '/init',
        body: '自动生成 CLAUDE.md。扫描项目技术栈、目录结构、已有约定，生成 AI 行为规则文件。新项目接入 AI 工作流的第一步。',
      },
      {
        icon: '⚡',
        title: '/fewer-permission-prompts',
        body: '分析历史 transcript，找出频繁触发授权弹窗的命令，自动写入 allowlist。减少 90% 的权限打断，让 AI 自主完成长任务。',
      },
    ])}`;

  const superpowerTipsHtml = `
    ${stepList([
      {
        title: '把重复出现的上下文固化成 Skill',
        desc: '同一段"项目背景 + 规则"写了三次，就是该写 Skill 的信号。把它存进 <code>SKILL.md</code>，下次一句 <code>/my-project-context</code> 搞定。',
      },
      {
        title: '用 /brainstorming 替代直接实现',
        desc: '遇到"要不要加这个功能""怎么设计这个 API"之类的决策点，先调 /brainstorming 展开选项，再做决定。跳过这步往往导致做了一半才发现方向不对。',
      },
      {
        title: '链式调用：brainstorming → spec → implement → review',
        desc: '这四步串联是最高效的 AI 工作流。每步都有对应 Skill，不需要自己维护上下文连贯性。',
      },
    ])}
    ${ruleBox('purple', `<strong>写 Skill 的门槛很低：</strong>一个 <code>SKILL.md</code> 文件 + 一段清晰的上下文指令就够了。不需要会写代码，能把"每次让 AI 做这件事时需要知道什么"描述清楚就行。`)}`;

  // ── UI UX Pro Max ──────────────────────────────────────────────────────────

  const uiIntroHtml = `
    <p>AI 生成的 UI 默认有一个问题：<strong>它总是输出"合理但无聊"的界面</strong>——功能正确、视觉平庸，像模板一样，没有设计意图。UI UX Pro Max 类 Skill 的目标是让 AI 输出有品质感的界面，而不只是能用的界面。</p>
    ${ruleBox('warning', `<strong>核心认知：</strong>让 AI 写 UI 时，不说"做一个漂亮的页面"——"漂亮"对 AI 意味着 Bootstrap 风格 + 随机渐变色。要说清楚视觉语言、布局意图、交互细节。`)}`;

  const uiSkillHtml = `
    ${ruleBox('purple', `<strong>/frontend-design</strong> — 专门解决"AI 生成 UI 千篇一律"问题。调用后 AI 会主动问设计意图、参考风格、目标用户，输出有审美决策的实现，而不是套模板。适用于：新页面、重要组件、需要打磨视觉质感的场合。`)}

    ${cardGrid([
      {
        icon: '🎨',
        title: '截图驱动设计',
        body: '把参考设计截图直接给 AI："做成这个风格"。视觉参考比任何文字描述都精准，能跳过 3 轮对话。',
      },
      {
        icon: '📐',
        title: '指定设计系统',
        body: '告诉 AI 用哪套设计语言：shadcn/ui、Radix、Ant Design，或自定义 token 系统。AI 会严格遵守，不乱引入新组件。',
      },
      {
        icon: '📱',
        title: '明确设备优先级',
        body: '"移动端优先，桌面端次之"比"响应式布局"更有指导性。AI 会从小屏出发设计，而不是把桌面版缩放到移动端。',
      },
      {
        icon: '🌗',
        title: '暗色模式同步',
        body: '在 Prompt 里加"同时提供暗色模式变量"，而不是实现后再补。后期补 dark mode 的成本是前期同步写的 5 倍。',
      },
    ])}`;

  const uiPromptPatternsHtml = `
    ${codeBlock('描述视觉意图，不只是功能', 'dot-purple', 'text',
`✅ 设计一个用户资料卡片，风格参考 Linear 的 Issue 卡片：
   - 信息密度高但不拥挤
   - 用分割线区分主次信息
   - 悬浮时有轻微 elevation 变化
   - 配色基于已有的 CSS token

❌ 做一个好看的用户卡片`)}

    ${codeBlock('给出交互细节', 'dot-cyan', 'text',
`实现搜索框组件：
- 聚焦时 border 从 --border-default 变为 --border-focus，过渡 150ms
- 输入时右侧出现清空按钮（✕），淡入动画 100ms
- 空状态显示 placeholder，有内容时 placeholder 消失（不是 float label）
- 移动端：软键盘弹起时输入框滚动到可视区`)}

    ${codeBlock('指定动效预期', 'dot-green', 'text',
`页面内容加载时：
- 骨架屏淡出，内容淡入（200ms ease-out）
- 列表项错落出现，每项延迟 30ms（不超过 5 项，之后同时出现）
- 不要用弹跳动画（bounce），整体风格沉稳`)}

    ${ruleBox('info', `<strong>让 AI 解释它的设计决策：</strong>"实现完后告诉我：你选这个间距的原因、为什么用这个颜色层次、这个交互模式来自哪个设计模式。" 这既是 Review，也是学设计的最快路径。`)}`;

  const uiAccessibilityHtml = `
    <p>AI 写 UI 时经常遗漏无障碍细节，一次性说清楚比事后补省时得多。</p>
    ${codeBlock('无障碍清单（直接粘进 Prompt）', 'dot-yellow', 'text',
`实现时一并处理：
- 所有可交互元素有 aria-label 或关联 label
- 焦点顺序合理，支持 Tab 键导航
- 颜色对比度 ≥ 4.5:1（正文），≥ 3:1（大文字/图标）
- 表单错误信息通过 aria-describedby 关联到输入框
- 动画遵守 prefers-reduced-motion`)}`;

  // ── Web Access ────────────────────────────────────────────────────────────

  const webIntroHtml = `
    <p>AI 的知识有截止日期，但你写代码时依赖的库在实时更新。Web Access 能力让 AI 在对话中访问最新文档、检查 API 变更、调研技术方案——<strong>不再靠记忆，而是实时查</strong>。</p>
    ${ruleBox('accent', `<strong>使用时机：</strong>涉及版本依赖、最新 API 用法、第三方服务配置时，主动让 AI 去查，而不是靠它的训练数据猜。训练数据里的"最新"可能是一年前的。`)}`;

  const webUseCasesHtml = `
    ${cardGrid([
      {
        icon: '📖',
        title: '查最新文档',
        body: '"去查 Prisma 5.x 的 $transaction API，我想知道嵌套事务的最新用法是否有变化。"避免用了半年前已废弃的 API。',
      },
      {
        icon: '🔄',
        title: '确认 Breaking Change',
        body: '"查 Next.js 15 的 release notes，找出从 14 迁移的 Breaking Changes 清单，我要升级。"比自己翻 Changelog 快 10 倍。',
      },
      {
        icon: '🔍',
        title: '调研技术方案',
        body: '"帮我调研 2025 年 React 状态管理的主流方案，重点看 Jotai、Zustand、Valtio 的社区活跃度和 React 19 兼容性。"',
      },
      {
        icon: '🐛',
        title: '查已知 Bug / Issue',
        body: '"去查 React Query v5 + React 19 有没有已知的 hydration 兼容问题，有的话看看社区的临时解法。"',
      },
      {
        icon: '🛠',
        title: 'SDK / CLI 用法',
        body: '"查 Stripe CLI 最新版本的 webhook 测试命令，我的旧命令报参数不认识了。"版本迭代快的工具，每次都查一下比记忆可靠。',
      },
      {
        icon: '🌐',
        title: '竞品 / 参考调研',
        body: '"调研三个主流的 React Date Picker 库（react-day-picker、react-datepicker、MUI DatePicker），列出各自的包大小、无障碍支持、最后更新时间。"',
      },
    ])}`;

  const webPromptPatternsHtml = `
    ${codeBlock('查文档时给出版本号', 'dot-cyan', 'text',
`查 TanStack Query v5 的 useInfiniteQuery，
特别是 initialPageParam 和 getNextPageParam 的新签名，
我从 v4 迁移过来，旧的写法报类型错误了`)}

    ${codeBlock('限定搜索范围', 'dot-green', 'text',
`只查官方文档和 GitHub Release Notes，
不要引用 Medium 文章或 Stack Overflow 过时答案`)}

    ${codeBlock('让 AI 带源链接', 'dot-blue', 'text',
`帮我找 Tailwind CSS v4 配置 dark mode 的方式，
给出官方文档链接，我要自己确认一下`)}

    ${codeBlock('调研后直接出方案', 'dot-purple', 'text',
`调研完后，根据我们项目的约束（React 19、不引入 CSS-in-JS、包大小 < 50KB）
直接推荐最合适的一个方案，说明理由`)}`;

  const webCaveatsHtml = `
    ${ruleBox('warning', `<strong>搜索结果不等于事实</strong><br>
    AI 用 Web Access 查到的内容可能来自过时文章、错误的 Stack Overflow 答案或质量参差不齐的博客。<strong>涉及安全配置、生产 API、Breaking Change，永远让 AI 给出原始链接，自己点进去确认。</strong>`)}
    ${ruleBox('danger', `<strong>不适合 Web Access 的场景</strong><br>
    <ul style="margin-top:6px;padding-left:18px">
      <li>查公司内网文档（AI 无法访问）</li>
      <li>需要登录的 GitHub 私有 Repo / Jira / Confluence</li>
      <li>实时性要求极高的数据（股价、服务状态）——用专用 MCP 工具更可靠</li>
    </ul>`)}`;

  const webMcpHtml = `
    <p>Web Access 的升级版是配置 <strong>MCP（Model Context Protocol）工具</strong>——让 AI 直接调用认证过的外部服务，而不是靠搜索猜答案。</p>
    ${cardGrid([
      {
        icon: '🔗',
        title: 'GitHub MCP',
        body: '让 AI 直接读私有 Repo、查 PR、看 Issue。不再需要复制粘贴代码片段。',
      },
      {
        icon: '📊',
        title: 'Linear / Jira MCP',
        body: '让 AI 直接查票、更新状态、关联 PR。把项目管理和编码对话打通。',
      },
      {
        icon: '🗄',
        title: 'Database MCP',
        body: '让 AI 查询开发数据库 Schema、运行只读 SQL、理解数据结构。无需粘贴 schema dump。',
      },
      {
        icon: '📝',
        title: 'Notion / Confluence MCP',
        body: '让 AI 直接读内部设计文档、会议记录、架构决策。内部知识直接进上下文。',
      },
    ])}
    ${ruleBox('info', `<strong>MCP vs Web Access：</strong>Web Access 是"AI 帮你 Google"，MCP 是"AI 有权限直接操作你的工具"。MCP 效率更高，但需要配置授权；Web Access 开箱即用，适合调研公开资料。两者都有价值，不互斥。`)}`;

  // ── Assemble ────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('Superpower — 把经验变成可复用 Skill', superpowerIntroHtml)}
    ${section('推荐 Skill 清单', superpowerSkillsHtml)}
    ${section('如何用好 Skill', superpowerTipsHtml)}

    ${section('UI UX Pro Max — 让 AI 输出有品质感的界面', uiIntroHtml)}
    ${section('/frontend-design 与视觉设计工作流', uiSkillHtml)}
    ${section('UI Prompt 模式', uiPromptPatternsHtml)}
    ${section('无障碍：一次说清，不要事后补', uiAccessibilityHtml)}

    ${section('Web Access — 实时查，不靠记忆猜', webIntroHtml)}
    ${section('六个典型使用场景', webUseCasesHtml)}
    ${section('Web Access Prompt 模式', webPromptPatternsHtml)}
    ${section('注意事项', webCaveatsHtml)}
    ${section('进阶：MCP 工具让 AI 直连你的服务', webMcpHtml)}
  `);
}
