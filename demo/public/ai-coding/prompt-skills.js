function renderPromptSkills(t) {
  const weakVsStrong = `
    ${codeBlock('❌ 弱提示', 'dot-red', 'text', `写一个用 useEffect 和 useState 实现的防抖 Hook`)}
    ${codeBlock('✅ 强提示', 'dot-green', 'text', `实现一个 useDebounce(value, delay) Hook，要求：
• delay 变化时重置计时器
• 组件卸载时清理定时器
• 返回值类型与输入 value 一致（泛型）
• 包含 JSDoc 注释`)}`;

  const contextHtml = `<p>在对话开始时告诉 AI 当前项目的技术栈、约束条件和背景，避免每次重复解释。对于长期项目，把这些写入 <code>CLAUDE.md</code> 或 <code>.cursorrules</code>。</p>
    ${codeBlock('项目上下文模板', 'dot-cyan', 'text', `你是一个 React 19 + TypeScript 项目的开发者。
项目使用 Zustand 管理状态，CSS Modules 写样式，
严格禁止使用 any 类型，
所有组件都需要写单元测试（Vitest + Testing Library）。`)}`;

  const decomposeHtml = `
    <p>不要在单个提示里堆砌过多要求。把大任务拆成顺序的子任务，每步确认后再推进。</p>
    ${stepList([
      { title: '先出结构，不出实现', desc: '"先列出这个功能需要哪些文件和接口，不用写具体实现"' },
      { title: '逐模块实现', desc: '确认结构后，一个模块一个模块地推进，保持上下文聚焦' },
      { title: '最后集成与测试', desc: '整体跑通后再处理边界 case 和测试覆盖' },
    ])}`;

  const negativeHtml = `<p>明确告诉 AI 什么不要做，往往和告诉它做什么一样重要。</p>
    ${codeBlock('负面约束示例', 'dot-yellow', 'text', `重构这个组件，
不要修改 props 接口，
不要引入新的外部依赖，
不要改变现有测试`)}`;

  const explainHtml = `<p>对于不确定的代码，要求 AI 解释关键决策，而不只是生成代码。</p>
    ${codeBlock('示例', 'dot-purple', 'text', `实现上面的 Cache 类，并对每个非显而易见的设计决策写一行注释说明原因`)}`;

  const formatHtml = `<p>告诉 AI 你要的是完整文件、代码片段、diff，还是只需要思路。格式不对会导致大量整理成本。</p>
    ${codeBlock('格式控制示例', 'dot-blue', 'text', `只输出修改后的函数体，不要整个文件，不要 markdown 代码块包裹`)}`;

  const tipTable = compareCard([
    ['给角色与上下文',   '项目背景 + 技术栈',    '让 AI 的每次输出都符合项目规范，无需重复说明'],
    ['描述 WHAT 不是 HOW', '定义期望行为和约束',  '让 AI 决定实现方式，你只关注需求和边界'],
    ['分步拆解',         '结构 → 实现 → 集成',   '复杂任务分段推进，每步确认，降低返工率'],
    ['负面约束',         '明确不做什么',         '防止 AI 过度发挥或破坏已有代码'],
    ['要求解释',         '让 AI 注释关键决策',   '加深理解，同时方便 Review'],
    ['指定输出格式',     '函数体/完整文件/思路',  '减少整理成本，直接可用'],
  ], ['技巧', '做法', '效果']);

  return articleShell(t, `
    ${section('技巧速览表', tipTable)}
    ${section('弱提示 vs 强提示', weakVsStrong)}
    ${section('给出角色与上下文', contextHtml)}
    ${section('分步拆解复杂任务', decomposeHtml)}
    ${section('负面约束同样重要', negativeHtml)}
    ${section('让 AI 解释，不只是生成', explainHtml)}
    ${section('明确输出格式', formatHtml)}
  `);
}
