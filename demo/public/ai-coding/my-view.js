function renderMyView(t) {
  const coreTake = ruleBox('accent',
    `AI 降低的是<strong>执行成本</strong>，而不是<strong>思考成本</strong>。越是高阶的使用方式，对工程师的抽象能力和架构直觉要求越高。`);

  const threeLayersHtml = `
    ${ruleBox('info', `<strong>第一层：自动补全（Autocomplete）</strong> — AI 预测你接下来要写什么。用处实在，但本质仍是被动的——你在写，AI 在跟。以 GitHub Copilot 初期形态为代表。`)}
    ${ruleBox('accent', `<strong>第二层：对话式辅助（Chat-assisted coding）</strong> — 你用自然语言描述需求，AI 生成代码片段。主动权回到你手里，但仍需要你负责整合、验证、修改。Cursor 的对话模式、ChatGPT 都属于这一层。`)}
    ${ruleBox('purple', `<strong>第三层：智能体编程（Agentic coding）</strong> — AI 能自主规划步骤、读文件、跑测试、处理错误，直到完成一个完整任务。Claude Code、Cursor Agent 是这一层的代表。这里最需要你的判断力，而不是替换它。`)}`;

  const pivotHtml = `<p>过去几年出现了三个同步提升：<strong>上下文窗口</strong>从 8K 扩展到 200K+；<strong>IDE 集成深度</strong>从外部工具到原生 Agent；<strong>开发者使用习惯</strong>从"试一下"到"每天必用"。三者叠加，才形成了真实的生产力跃升。</p>
    <p>对我而言，最大的改变是<strong>时间分配的变化</strong>：以前 60% 的时间在写样板代码、查文档、处理 trivial bug，现在这部分可以压缩到 20% 以下，剩余精力投入到设计决策和复杂问题上。</p>`;

  return articleShell(t, `
    ${section('核心观点', coreTake)}
    ${section('三层使用模型', threeLayersHtml)}
    ${section('为什么现在是拐点', pivotHtml)}
    ${section('本质：需要驾驭的工具', `<p>AI 写代码的准确率取决于你<strong>描述问题的质量</strong>。一个含糊的提示只会得到含糊的代码；一个精确的上下文描述会让 AI 表现出远超预期的能力。这意味着编程中最核心的能力——<strong>分析问题、分解任务、定义边界</strong>——变得比以往更重要，而不是更不重要。</p>`)}
  `);
}
