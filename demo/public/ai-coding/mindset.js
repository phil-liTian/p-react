function renderMindset(t) {
  const p1 = `<p>AI 生成的代码需要像对待初级工程师提交的 PR 一样审阅。它可能完全正确，也可能有微妙的 bug、遗漏的 edge case 或不符合项目规范的写法。你的责任是鉴别，而不是照单全收。</p>`;

  const p2 = `<p>给 AI 的任务粒度越清晰，输出质量越高。把"重构这个模块"换成"把 <code>UserService</code> 中的数据库调用抽取到 Repository 层，保持现有接口不变，为每个方法添加错误处理"，结果会完全不同。</p>
    ${ruleBox('info', `<strong>经验法则：</strong>一个好的任务描述应该让你自己也能根据它验收结果。如果你说不清楚"做完了"是什么样子，AI 也说不清楚。`)}`;

  const p3 = `<p>AI 生成的代码一旦合并，就是你的代码，你负全责。这意味着你必须真正理解它——不是逐行背诵，而是能解释为什么这样写、它在什么条件下会失效、如何测试它。</p>`;

  const p4 = `<p>对复杂任务，第一轮输出很少是最终答案。把 AI 的输出当作草稿，在上面做批注、指出问题、要求修改。这种迭代对话往往比一次完美的 Prompt 更高效。</p>`;

  const p5 = `<p>记录下哪些 Prompt 模式在你的工作场景下效果好，形成可复用的模板。好的 Prompt 是经验的结晶，不该每次从头设计。对于长期项目，把项目约定写入 <code>CLAUDE.md</code> 或 <code>.cursorrules</code>，包括：技术栈版本、命名规范、禁止用的库、架构约定等，AI 每次对话都自动获得一致的上下文。</p>`;

  const principles = kvList([
    ['把 AI 当初级同事',  'AI 生成代码 → 你负责 Review，而不是 Oracle 式的无条件信任'],
    ['任务粒度决定质量',  '描述清晰 + 边界明确 → AI 输出质量成倍提升'],
    ['保持代码所有权',    '合并了就是你的代码，你对它的正确性和可维护性负责'],
    ['迭代优于完美提示',  '把 AI 输出当草稿，快速迭代远比设计完美 Prompt 更实用'],
    ['固化上下文',        'CLAUDE.md / .cursorrules 让每次对话都有一致的项目背景'],
  ]);

  return articleShell(t, `
    ${section('五条核心原则', principles)}
    ${section('把 AI 当初级同事，不是 Oracle', p1)}
    ${section('任务粒度决定质量', p2)}
    ${section('保持对代码的所有权', p3)}
    ${section('迭代而不是期待一次成功', p4)}
    ${section('固化上下文 / 建立 Prompt 库', p5)}
  `);
}
