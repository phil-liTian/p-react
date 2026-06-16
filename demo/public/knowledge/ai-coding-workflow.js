function renderAiCodingWorkflow(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>AI 辅助编程不是"让 AI 帮你写代码"，而是把 AI 当作一个随时可用的<strong>高级 pair-programmer</strong>。
    核心价值在于：消除上下文切换（不用开浏览器搜文档）、快速生成样板代码、加速代码审查与重构。
    关键原则：<strong>你负责思考，AI 负责表达</strong>——设计决策、架构判断、业务逻辑理解必须由工程师掌控。`);

  const scenarios = `
    <p><strong>高价值场景（ROI 最高）：</strong></p>
    <ul>
      <li><strong>样板代码生成</strong>：CRUD 接口、表单验证、测试用例骨架——AI 最擅长这类"结构确定、内容重复"的任务</li>
      <li><strong>代码解释与文档</strong>：把复杂函数或陌生库的用法解释清楚，比搜 Stack Overflow 快 10 倍</li>
      <li><strong>重构建议</strong>：把一段代码粘给 AI，让它指出代码味道（code smell）和改进方向</li>
      <li><strong>正则 / SQL / CSS</strong>：复杂正则表达式、SQL 查询、CSS 动画——精确描述需求即可</li>
      <li><strong>单元测试生成</strong>：给一个函数让 AI 生成边界用例，覆盖率提升快</li>
    </ul>
    <p><strong>低价值场景（谨慎使用）：</strong></p>
    <ul>
      <li>架构设计和技术选型——AI 的建议缺乏对你业务约束的感知</li>
      <li>生产环境安全相关逻辑——AI 可能生成看起来正确但有漏洞的代码</li>
      <li>需要深度理解业务域的核心逻辑——AI 不了解你的数据模型和业务规则</li>
    </ul>`;

  const toolComparison = `
    <p><strong>主流工具对比：</strong></p>`;

  const toolTable = `
    <table class="metrics-table">
      <thead><tr><th>工具</th><th>核心能力</th><th>最适合场景</th><th>注意点</th></tr></thead>
      <tbody>
        <tr><td>GitHub Copilot</td><td>IDE 内联补全，上下文感知强</td><td>日常编码、补全当前文件逻辑</td><td>补全可能过于自信，需逐行审查</td></tr>
        <tr><td>Claude Code / Claude</td><td>长上下文、多文件理解、指令遵循精准</td><td>重构、架构讨论、文档生成</td><td>不会主动"猜测"，需要明确提问</td></tr>
        <tr><td>Cursor</td><td>基于 VS Code，AI diff 修改整个文件</td><td>大范围重构、跨文件修改</td><td>修改范围大时需仔细 review diff</td></tr>
      </tbody>
    </table>`;

  const workflowCode = `// 高效 AI 编程工作流示例

// ✗ 低效提问：描述模糊，AI 只能给出通用答案
"帮我写一个 React 组件"

// ✓ 高效提问：角色 + 约束 + 上下文 + 期望输出
\`你是一个 React 19 + TypeScript 专家。
帮我写一个 SearchInput 组件，要求：
1. 受控组件，value/onChange 通过 props 传入
2. 带 300ms 防抖，防抖后调用 onSearch(value)
3. 显示清空按钮（当有值时），点击清空触发 onSearch('')
4. 使用 useCallback 避免子组件不必要重渲染
5. 不引入任何第三方库\`

// ─────────────────────────────────────────────
// Review AI 生成代码的检查清单：

// 1. 逻辑正确性：边界条件是否处理（null/undefined/空数组）？
// 2. 类型安全：TypeScript 类型是否精确，有无 any 逃逸？
// 3. 性能隐患：有无不必要的重渲染，闭包是否正确捕获？
// 4. 安全问题：有无 dangerouslySetInnerHTML，SQL 注入，未转义输出？
// 5. 测试覆盖：生成的代码是否附带了测试？边界用例够不够？`;

  const iterationCode = `// 迭代式工作流：把 AI 当结对程序员而非代码生成器

// Step 1：先让 AI 解释它的方案
"在实现防抖 SearchInput 之前，先告诉我你打算用什么方案，不要写代码"
// → AI 会说：用 useRef 存 timer ID，在 onChange 里 clearTimeout + setTimeout
// → 你评估方案是否合理，再决定继续

// Step 2：分步实现，每步验证
"好，先只实现防抖逻辑，其他功能暂不添加"

// Step 3：让 AI 审查自己的输出
"检查上面的代码，有没有潜在的内存泄漏或闭包问题？"

// Step 4：让 AI 生成测试
"为这个组件生成 vitest + @testing-library/react 的测试，
 重点覆盖：防抖触发时机、清空按钮显示逻辑、受控组件行为"`;

  const notes = [
    ruleBox('warning', `<strong>版权与隐私风险：</strong>不要把公司核心业务代码、客户数据、密钥、内部 API 粘给公共 AI 服务。使用企业版或本地部署的模型处理敏感代码。AI 训练数据可能包含 copyleft 许可证代码，生成的代码在商业项目中需注意版权合规。`),
    ruleBox('danger', `<strong>"看起来对"的幻觉代码：</strong>AI 生成的代码在语法上几乎总是正确的，但可能调用了不存在的 API（尤其是库的旧版本 API）、忽略了竞态条件、或在极端情况下行为错误。<strong>生成的代码必须经过测试，不能只看静态代码觉得"应该没问题"。</strong>`),
    ruleBox('success', `<strong>最大化 AI 价值的心态：</strong>把 AI 看作一个"知识渊博但不了解你业务"的实习生。你的工作是：给出清晰的任务定义、提供足够的上下文、审查输出质量、做最终判断。越是明确地告诉 AI"你是谁、要做什么、约束是什么、输出格式是什么"，输出质量越高。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('适用场景', scenarios)}
    ${section('工具选择', toolComparison + toolTable)}
    ${section('代码示例', codeBlock('高效提问 + Review 检查清单', 'dot-blue', 'javascript', workflowCode) + codeBlock('迭代式 AI 工作流', 'dot-green', 'javascript', iterationCode))}
    ${section('注意事项', notes.join(''))}`);
}
