function renderSuperpowers(t) {
  const invocationCode = `# 方式一：用户在 prompt 中显式调用
/brainstorming
/superpowers:systematic-debugging

# 方式二：Claude 在工具调用链中自动触发（通过 Skill tool）
# 当 using-superpowers 技能检测到场景匹配时，Claude 会自动 invoke`;

  const skillsTable = `
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
      <thead>
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">SKILL</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">触发时机</th>
          <th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:600;font-size:11px;letter-spacing:0.5px">作用</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['brainstorming', '创建功能/组件前', '梳理需求、提出方案、等用户确认后再动手'],
          ['writing-plans', '有 spec 需要拆解实现时', '生成含完整代码的分步计划文档'],
          ['executing-plans', '执行已有 plan 时', '逐步推进、设 checkpoint、可暂停审查'],
          ['superpowers:test-driven-development', '实现任何 feature 或 bugfix 前', '先写失败测试，再写最小实现，循环迭代'],
          ['superpowers:systematic-debugging', '遇到 bug / 测试失败时', '系统化定位根因，不乱猜不乱改'],
          ['superpowers:verification-before-completion', '声称工作完成前', '强制跑验证命令、看输出后才能说"Done"'],
          ['superpowers:finishing-a-development-branch', '实现完成需要合并时', '给出 merge / PR / cleanup 的结构化选项'],
          ['superpowers:dispatching-parallel-agents', '有 2+ 个独立任务时', '并行派发 subagent，加速执行'],
          ['superpowers:receiving-code-review', '收到 code review 反馈时', '严格验证反馈正确性后再改，不盲目接受'],
        ].map(([name, when, desc]) => `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:8px 10px;font-family:var(--font-code);font-size:11.5px;color:var(--accent-light)">${name}</td>
            <td style="padding:8px 10px;color:var(--text-secondary)">${when}</td>
            <td style="padding:8px 10px;color:var(--text-muted)">${desc}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  const principles = [
    ruleBox('warning', '<strong>1% 原则：</strong>只要有 1% 的可能某个 skill 适用，就必须调用它。常见理由化（"这太简单了不需要 skill"、"我先做完这件小事"）都是失败信号。'),
    ruleBox('info', '<strong>优先级：</strong>Process skills 优先（brainstorming、debugging），再执行 implementation skills。"Let\'s build X" → 先 brainstorming，再写代码。'),
    ruleBox('success', '<strong>安装方式：</strong>将 superpowers 插件目录放入 <code>~/.claude/plugins/</code>，Claude Code 启动时自动加载。可通过 <code>/using-superpowers</code> 查看已加载的所有 skill 列表。'),
  ];

  return articleShell(t, `
    ${section('是什么', `<p>${t.summary}</p><p style="margin-top:8px">Skills 本质上是一份 Markdown 文档，描述了某类任务的最佳工作流。Claude 读取 skill 内容后，会按其中的步骤清单执行，而不是凭直觉随意发挥。</p>`)}
    ${section('如何触发 Skill', codeBlock('调用方式', 'dot-yellow', 'bash', invocationCode))}
    ${section('核心 Skill 速查', skillsTable)}
    ${section('使用原则', principles.join(''))}`);
}
