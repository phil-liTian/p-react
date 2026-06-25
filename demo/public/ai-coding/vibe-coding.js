function renderVibeCoding(t) {
  const whatIsHtml = `
    <p>Vibe Coding 是 Andrej Karpathy 提出的一种编程方式：<strong>完全顺着感觉走，把具体实现全权交给 AI，自己只负责描述意图和验收结果</strong>。你不再逐行盯着代码，而是像产品经理一样描述"我想要什么"，让 AI 迭代直到对了为止。</p>
    <p>这不是偷懒，而是一种意识上的转变——<strong>从"我来写代码"变成"我来定义问题"</strong>。对于原型验证、个人项目、不熟悉的技术栈，Vibe Coding 的效率远超传统方式。</p>
    ${ruleBox('accent', `<strong>核心心态：</strong>放下对"我必须理解每一行代码"的执念。在 Vibe Coding 场景下，能跑、能验收、能迭代，就够了。深度理解留给你真正在意的核心模块。`)}`;

  const whenHtml = `
    ${cardGrid([
      { icon: '🚀', title: '原型 / Demo 快速验证', body: '48 小时内验证一个想法是否可行，不需要生产级代码质量。' },
      { icon: '🌐', title: '不熟悉的技术栈', body: '需要写一个 Python 脚本、一段 Shell、一个 iOS 小功能——你不想花时间系统学，AI 直接生成。' },
      { icon: '🛠', title: '工具脚本 / 自动化', body: '一次性用的数据处理脚本、批量文件操作、API 调试工具，写完即抛。' },
      { icon: '🎨', title: '前端页面快速成型', body: '把设计稿/截图/草图描述给 AI，快速出可交互的页面，再人工调整细节。' },
    ])}
    ${ruleBox('warning', `<strong>不适合 Vibe Coding 的场景：</strong>核心业务逻辑、安全敏感模块、需要长期维护的生产代码——这些场景必须你主导，AI 辅助。`)}`;

  const tipsHtml = `
    ${stepList([
      {
        title: '从目标开始，不从技术开始',
        desc: '不要说"用 React 写一个组件"，要说"我需要一个可以搜索过滤的下拉选择框，支持多选，选中项显示在输入框里"。描述用户看到的行为，而不是实现方式。',
      },
      {
        title: '一次只推进一个功能点',
        desc: 'Vibe Coding 最大的失控来源是贪多——一次让 AI 做十件事，结果一团乱。每次 prompt 只聚焦一个清晰的功能，跑通了再推进下一个。',
      },
      {
        title: '截图 / 粘贴 UI 作为参考',
        desc: '有设计稿或参考页面时，直接截图给 AI。"做成和这个截图一样的布局"比任何文字描述都精准，能节省 3 轮对话。',
      },
      {
        title: '遇到问题先问 AI，不要自己挣扎',
        desc: '出了 bug 直接把报错和相关代码贴给 AI，说"这里出错了，帮我修"。Vibe Coding 模式下不需要自己分析根因，AI 来做。',
      },
      {
        title: '卡住了就重开上下文',
        desc: '同一个问题反复改了三轮还不对，不要继续纠缠——开新对话，重新描述目标和约束。新的上下文往往比修修补补更快出结果。',
      },
      {
        title: '用自然语言写"验收标准"',
        desc: '每次让 AI 实现一个功能，顺手说出"完成后应该满足：点击按钮出现弹窗、弹窗关闭后数据清空"。AI 会把验收条件内化到实现里，减少反复修改。',
      },
      {
        title: '让 AI 给自己写的代码加注释',
        desc: '生成完代码后追问一句："给关键逻辑加中文注释"。不是为了学习，而是下次改动时 AI 能更准确理解已有代码的意图。',
      },
      {
        title: '定期做一次"快照提交"',
        desc: '每完成一个可运行的里程碑就 git commit 一次，哪怕代码很粗糙。AI 下一轮改坏了可以秒回滚，不必慌。',
      },
    ])}`;

  const promptPatternsHtml = `
    ${codeBlock('描述行为，不描述实现', 'dot-green', 'text',
`✅ 我想要一个表格，每行末尾有删除按钮，点击后该行消失，同时底部计数实时更新
❌ 用 useState 管理一个数组，点击时用 filter 删除对应 index 的元素`)}
    ${codeBlock('给出约束边界', 'dot-cyan', 'text',
`实现一个图片上传组件：
- 只接受 jpg/png，超过 2MB 提示错误
- 上传中显示进度条
- 不要引入新的第三方库
- 样式用现有的 CSS Modules`)}
    ${codeBlock('出错时提供足够上下文', 'dot-yellow', 'text',
`这段代码报错了：
[粘贴报错信息]

相关代码：
[粘贴出问题的函数]

我猜可能是异步时序问题，但不确定，帮我分析一下并修复`)}
    ${codeBlock('让 AI 自评并优化', 'dot-purple', 'text',
`你刚才生成的代码有哪些潜在问题？特别是边界 case 和性能方面。
列出问题后直接给出修复版本。`)}`;

  const antiPatternsHtml = `
    ${ruleBox('danger', `<strong>一次性丢几百行需求</strong> — AI 的注意力是有限的，需求越长越容易遗漏细节。拆成小块逐步推进，效果远好于一次 all-in。`)}
    ${ruleBox('danger', `<strong>生成后直接上线不测</strong> — Vibe Coding 不等于不验收。每个功能跑一遍主流程，哪怕只是手动点几下，不能省。`)}
    ${ruleBox('warning', `<strong>在同一对话里反复改 + 反复撤</strong> — "不对不对改回去再改再改回去"会让上下文越来越乱。重开新对话成本极低，不要舍不得。`)}
    ${ruleBox('warning', `<strong>把 Vibe Coding 用在核心模块上</strong> — 认证、支付、权限、数据迁移，这些地方不能"顺着感觉走"。每一行都要清楚为什么这样写。`)}
    ${ruleBox('info', `<strong>把 AI 当 Google 用</strong> — 问"怎么用 flexbox 居中"这类问题是在浪费 Vibe Coding 的潜力。它应该处理"给我实现一个完整的居中布局方案，包括各种内容长度的适配"这类任务。`)}`;

  const vsTraditionalHtml = compareCard([
    ['从哪里开始',   '从技术实现开始，想清楚怎么写', '从目标行为开始，描述用户看到什么'],
    ['代码理解',     '写之前就理解每一行',           '先跑通，有需要再深入理解'],
    ['遇到 bug',     '自己分析定位，查文档',         '直接把报错扔给 AI，让它修'],
    ['迭代节奏',     '完整设计后再实现',             '小步快跑，每次只推进一个点'],
    ['上下文管理',   '自己维护整体状态',             '定期提交快照，卡住就重开对话'],
    ['适用场景',     '生产代码、核心逻辑',           '原型、脚本、不熟悉的技术栈'],
  ], ['对比维度', '传统方式', 'Vibe Coding']);

  const extraTipsHtml = `
    ${ruleBox('purple', `<strong>善用 Skill，把套路沉淀下来</strong><br>
    遇到反复出现的任务——TDD、Code Review、UI 设计、网页调研——不要每次都从头写 Prompt。把有效的上下文指令存成 Skill（<code>SKILL.md</code> 或自定义 slash command），下次一句话调用。好的 Skill 是经验的结晶，比任何单次的"完美 Prompt"都值钱，因为它可以复用。`)}
    ${ruleBox('warning', `<strong>贵模型别拿来搬砖</strong><br>
    Claude Opus、GPT-4o 这类高端模型，推理能力强，但 Token 贵、速度相对慢。<strong>出方案、做 Review、判断架构</strong>——这些用贵模型，值。<strong>按 Task 逐步实现、写样板代码、补单元测试</strong>——这些交给便宜快速的小模型（Haiku、GPT-4o mini、Claude Sonnet）。贵的时间用在贵的地方，别让 Opus 帮你写 CRUD。`)}
    ${ruleBox('danger', `<strong>别听它说修好了，看证据</strong><br>
    AI 最常见的"甩锅话术"：<em>"已修复该问题"</em>、<em>"问题已解决，代码如下"</em>。<strong>永远不要只看它说了什么，要看 diff 改了什么。</strong>要求 AI 在修完后主动展示修改点，或者自己跑测试/点一遍主流程。说修好了 ≠ 真修好了，尤其是在上下文很长的对话末尾。`)}
    ${ruleBox('info', `<strong>上下文别越堆越乱</strong><br>
    对话轮次越多，AI 对早期约束的记忆越模糊，生成质量越下滑。<strong>识别信号：</strong>AI 开始重复已修过的错误、忘记之前定好的接口、给出和前面矛盾的方案——这时候不是继续追问，而是开新对话，把当前状态和约束重新精炼成一段上下文投喂进去。新鲜的上下文比修复一个腐烂的对话便宜得多。`)}`;

  const myWorkflowHtml = `
    <p>日常写需求时，按这个节奏走：</p>
    ${stepList([
      {
        title: '新建分支，确认工作区干净',
        desc: '<code>git checkout -b feat/xxx</code>，保证没有未提交的杂项改动混进来，也让后面每个 Task 的 diff 保持清晰可读。',
      },
      {
        title: '写一份轻量 Spec',
        desc: '把目标、约束、验收标准说清楚，不需要长篇大论，半页以内足够。这份 Spec 既是给 AI 的上下文，也是你自己的验收清单。',
      },
      {
        title: '看看有没有合适的 Skill',
        desc: '比如 TDD、Code Review、前端设计、网页调研。有现成 Skill 就调用，省去重写上下文的时间，也能保证一致的输出质量。',
      },
      {
        title: '先让顶级模型出方案，只讨论方案，不急着写代码',
        desc: '把 Spec 喂给 Opus 或 GPT-4o，要求给出技术方案和模块划分。<strong>方案阶段不产出代码</strong>，只讨论思路和权衡，确认后再动手。',
      },
      {
        title: '方案确认后，低价模型按 Task 一步步实现',
        desc: '把方案拆成独立的 Task，交给 Sonnet / Haiku 逐个实现。每个 Task 边界清晰，上下文小，出错率低，也容易 Review。',
      },
      {
        title: '每完成一个 Task：跑测试 → 看 diff → 小步提交',
        desc: '不要等到所有 Task 做完再提交。每完成一个可验证的 Task 就提交一次，diff 越小越好，出问题可以精确回滚。',
      },
      {
        title: '当前 diff 稳住后，顶级模型做一次 Review',
        desc: '把本次改动的 diff 给 Opus 做 Code Review。重点关注边界 case、安全隐患、可维护性问题，而不是格式和命名。',
      },
      {
        title: '修掉合理问题，再跑一遍测试',
        desc: 'Review 结论里不是所有建议都值得改，判断哪些是真问题、哪些是 over-engineering，选择性修复，改完再跑一遍测试确认没有回归。',
      },
      {
        title: '合并前，人工看关键 diff',
        desc: '涉及<strong>数据、权限、支付、定时任务</strong>类的改动，人工过一遍，必要时补文档、回滚方案或灰度说明。这一步不能省，也不能交给 AI 代劳。',
      },
    ])}
    ${ruleBox('accent', `这个流程比"一句话生成代码"慢一点。但慢的这点时间，通常会在后面赚回来——少很多返工、回滚和线上排雷。`)}
    <p><strong>短期原型可以大胆 Vibe，先把东西跑起来再说；但只要代码要长期维护，还是得回到工程流程里。</strong></p>
    <p>GitHub Flow 本身也是围绕分支、Pull Request、Review 和合并来组织协作，不是让人直接往主分支怼代码。Codex 这类工具也支持通过 <code>AGENTS.md</code> 放项目级规则，让 AI 按仓库里的约定做事，而不是每次都靠聊天临时提醒。</p>
    ${ruleBox('info', `<strong>说白了，AI 写代码越快，Git、测试、Review、Spec 这些老东西越不能丢。</strong><br>以前它们是为了约束人，现在还得顺手约束 AI。`)}`;

  return articleShell(t, `
    ${section('什么是 Vibe Coding', whatIsHtml)}
    ${section('什么时候用 Vibe Coding', whenHtml)}
    ${section('Vibe Coding vs 传统开发', vsTraditionalHtml)}
    ${section('8 个实用技巧', tipsHtml)}
    ${section('高效 Prompt 模式', promptPatternsHtml)}
    ${section('Anti-patterns：这些坑别踩', antiPatternsHtml)}
    ${section('进阶技巧', extraTipsHtml)}
    ${section('我常用的一套工程流程', myWorkflowHtml)}
  `);
}
