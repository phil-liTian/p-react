function renderLimitsRisks(t) {
  const limitsHtml = cardGrid([
    { icon: '🏛', title: '系统级架构决策', body: '微服务拆分、数据库选型、缓存策略——需要对业务增长模式和运维成本有判断，AI 只能给参考，不能做决策。' },
    { icon: '🔒', title: '安全性审计', body: 'AI 对常见安全模式有了解，但对项目特定的权限模型和数据流安全无法可靠评估。安全审计仍需专业人员。' },
    { icon: '⚡', title: '性能调优', body: 'AI 能给出通用优化建议，但真正的性能问题需要 profiling 数据支撑。没有数据的优化往往是猜测。' },
    { icon: '🧪', title: '新技术前沿', body: '训练数据有截止日期，对最新框架版本、刚发布的 API，AI 的知识可能过时。务必查阅官方文档。' },
    { icon: '🤝', title: '业务逻辑理解', body: 'AI 不了解你的业务背景、历史决策和潜规则。涉及核心业务逻辑的代码需要你主导。' },
    { icon: '🎯', title: '跨文件一致性', body: '即使在 Agent 模式下，AI 也可能在跨多文件修改时引入不一致。整体架构一致性需要你把关。' },
  ]);

  const risksHtml = `
    ${ruleBox('danger', `<strong>过度信任（Hallucination）：</strong>AI 会自信地生成不存在的函数签名、已废弃的 API 或逻辑错误的代码。对关键路径的代码必须验证。永远不要跳过测试，哪怕代码看起来很合理。`)}
    ${ruleBox('warning', `<strong>上下文污染：</strong>在一个对话中讨论太多不相关的话题会导致 AI 混淆上下文，产生意外的错误。复杂任务应该开新对话，保持上下文聚焦。`)}
    ${ruleBox('warning', `<strong>能力退化风险：</strong>长期让 AI 完成你本应自己练习的任务，会导致某些基础技能退化。刻意练习仍然有价值——特别是在你还处于成长期的技能方向上。`)}
    ${ruleBox('danger', `<strong>数据安全：</strong>不要向 AI 工具（尤其是云端服务）粘贴含有密钥、密码、用户真实数据的代码。使用脱敏示例或占位符替代敏感信息。`)}
    ${ruleBox('warning', `<strong>过度依赖单一工具：</strong>工具会停服、涨价、改变策略。保持对多个工具的了解，避免深度锁定（vendor lock-in）。`)}`;

  const checklist = compareCard([
    ['关键路径代码', '是否手动验证了逻辑？', '不能只靠"看起来对"'],
    ['新引入的 API', '是否查了官方文档确认存在？', 'AI 可能生成不存在的 API'],
    ['安全相关代码', '是否有专人审查？', '权限、认证、加密不能全靠 AI'],
    ['敏感信息', '是否使用了占位符？', '密钥/密码不应出现在提示词中'],
    ['对话长度', '是否开了新对话聚焦问题？', '超长对话会引入上下文污染'],
    ['测试覆盖', 'AI 生成的代码是否有测试？', 'AI 代码同样需要测试'],
  ], ['检查项', '问题', '原因']);

  const summaryHtml = `${ruleBox('accent',
    `AI Coding 工具让好的工程师更好，让懒的工程师更危险。它放大的是你已有的判断力——所以最值得投入的，永远是建立扎实的工程基础，而不是 Prompt 技巧本身。`)}`;

  return articleShell(t, `
    ${section('AI 不擅长的事', limitsHtml)}
    ${section('常见陷阱', risksHtml)}
    ${section('使用前检查清单', checklist)}
    ${section('一句话总结', summaryHtml)}
  `);
}
