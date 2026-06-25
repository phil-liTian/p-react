function renderToolComparison(t) {
  const overviewHtml = `<p>各工具在定位和使用场景上有明显分工，没有绝对的优劣，关键是匹配你的工作模式。</p>`;

  const toolTable = compareCard([
    ['GitHub Copilot', 'IDE 内联补全',      '已知模式的快速填充，不打断心流；上下文窗口有限，复杂任务无力'],
    ['Cursor',         'AI-first IDE',      '中等复杂任务，项目级上下文对话；对 JetBrains 用户迁移成本较高'],
    ['Claude Code',    'Terminal Agent',    '自主执行多步任务，CI/工程化脚本；消耗 token 较多，需要较强 Prompt 意识'],
    ['Windsurf',       'AI IDE (Cascade)',  '新手友好，任务流可视化；对大型复杂项目效果尚不稳定'],
    ['Gemini CLI',     'Terminal Agent',    'Google 生态下的命令行 Agent，适合 GCP 项目'],
    ['ChatGPT / Claude Web', '通用对话',   '探索方案、学习概念、小片段辅助；无文件系统访问，需手动粘贴代码'],
  ], ['工具', '定位', '适用场景 / 局限']);

  const recommendHtml = `
    ${ruleBox('success', `<strong>推荐组合：</strong>日常开发用 <strong>Cursor（项目内对话）+ Claude Code（复杂自主任务）</strong>，两者都基于 Claude 模型，上下文理解能力强。补全方面 Copilot 仍值得保留，三者并不冲突。`)}`;

  const chooseCriteriaHtml = `
    ${kvList([
      ['任务粒度',     '单行 / 函数级 → Copilot；文件级 → Cursor；跨文件多步骤 → Claude Code / Agentic 模式'],
      ['上下文规模',   '小项目 → 任意工具；大型单体仓库 → 优先选 Claude Code（200K token 窗口）'],
      ['交互偏好',     '不离开编辑器 → Cursor；命令行重度用户 → Claude Code；随时探索 → ChatGPT/Claude Web'],
      ['预算',         'Copilot 最便宜；Cursor Pro / Claude Code 按量计费，重度使用成本需评估'],
    ])}`;

  return articleShell(t, `
    ${section('工具全景', overviewHtml + toolTable)}
    ${section('推荐组合', recommendHtml)}
    ${section('如何选择', chooseCriteriaHtml)}
  `);
}
