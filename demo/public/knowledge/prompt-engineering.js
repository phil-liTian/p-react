function renderPromptEngineering(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Prompt Engineering 是通过精心设计输入来引导 LLM 输出高质量结果的技术。
    核心洞察：LLM 本质上是在做"续写"——<strong>你给的上下文越清晰、结构越好，它的续写质量就越高</strong>。
    前端工程师需要掌握的核心技术：角色设定（Role）、思维链（CoT）、Few-shot 示例、结构化输出约束。`);

  const techniques = `
    <p><strong>四大核心技术：</strong></p>
    <ul>
      <li><strong>角色设定（Role Prompting）</strong>：在 System Prompt 中明确 AI 的身份和约束，大幅提升领域专业性。</li>
      <li><strong>思维链（Chain of Thought, CoT）</strong>：让模型"先推理再回答"，用于复杂逻辑和数学问题，加一句"请一步一步思考"即可激活。</li>
      <li><strong>少样本示例（Few-shot）</strong>：在 Prompt 中提供 2-5 个输入→输出的示例，让模型学习你的格式偏好和任务模式。</li>
      <li><strong>结构化输出（Structured Output）</strong>：要求模型输出 JSON / XML，配合 Schema 约束，方便程序解析。</li>
    </ul>`;

  const roleCode = `// 角色设定（Role Prompting）

// ✗ 没有角色设定：输出通用泛泛
"帮我 code review 这段代码"

// ✓ 精准角色设定：输出专业且有针对性
\`你是一位 React 19 + TypeScript 专家，专注于：
- 性能优化（避免不必要重渲染）
- 类型安全（无 any 逃逸）
- 代码可读性（命名、抽象层次）

请 review 以下代码，重点关注上述三个维度。
对每个问题：说明问题位置、解释为什么是问题、给出修改建议。\`

// ── System Prompt vs User Prompt ──────────────────────
// System Prompt（通过 API 的 system 字段传入）：
//   - 设定 AI 的持久角色和约束
//   - 优先级高于用户输入
//   - 不会被普通用户覆盖（注意 Prompt 注入风险）
//
// User Prompt：
//   - 每次对话的具体任务
//   - 可以引用 System Prompt 中定义的规则`;

  const cotCode = `// 思维链（Chain of Thought）

// ✗ 直接要答案：复杂问题容易出错
"这段 React 代码有没有内存泄漏？"

// ✓ 触发 CoT：让模型先分析再结论
\`分析以下代码是否存在内存泄漏。
请按以下步骤思考：
1. 列出代码中所有的副作用（事件监听、定时器、订阅）
2. 检查每个副作用是否有对应的清理逻辑
3. 检查 useEffect 的依赖数组是否正确
4. 最终结论：是否存在内存泄漏，如果有，给出修复代码\`

// 代码示例
function DataFetcher({ url }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setData); // ← CoT 分析会发现：没有处理组件卸载后的竞态条件
  }, [url]);

  return <div>{JSON.stringify(data)}</div>;
}

// CoT 会识别出：缺少 AbortController 清理，组件卸载后 setData 仍可能被调用`;

  const fewShotCode = `// Few-shot 示例（示范输入→输出格式）

// 任务：从代码注释中提取 API 文档（自定义格式）
const prompt = \`
从 JSDoc 注释中提取 API 文档，输出 JSON 格式。

示例 1：
输入：
/**
 * 计算两数之和
 * @param {number} a 第一个数
 * @param {number} b 第二个数
 * @returns {number} 两数之和
 */
输出：
{"name":"add","params":[{"name":"a","type":"number"},{"name":"b","type":"number"}],"returns":"number"}

示例 2：
输入：
/**
 * 格式化日期
 * @param {Date} date 日期对象
 * @param {string} format 格式字符串，如 'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
输出：
{"name":"formatDate","params":[{"name":"date","type":"Date"},{"name":"format","type":"string"}],"returns":"string"}

现在处理：
/**
 * 防抖函数
 * @param {Function} fn 要防抖的函数
 * @param {number} delay 延迟毫秒数
 * @returns {Function} 防抖后的函数
 */
\`;
// Few-shot 后，模型会严格按照示例格式输出，无需额外说明`;

  const structuredCode = `// 结构化输出（Structured Output）

// ── 方案 1：Prompt 约束 + Zod 验证 ────────────────────
import { z } from 'zod';

const CodeReviewSchema = z.object({
  score: z.number().min(1).max(10),
  issues: z.array(z.object({
    line: z.number(),
    severity: z.enum(['error', 'warning', 'suggestion']),
    message: z.string(),
    fix: z.string().optional(),
  })),
  summary: z.string(),
});

const prompt = \`分析以下代码并输出 JSON，格式如下：
{
  "score": 1-10 的评分,
  "issues": [{"line": 行号, "severity": "error"|"warning"|"suggestion", "message": "问题描述", "fix": "修复建议"}],
  "summary": "总体评价"
}
只输出 JSON，不要其他内容。\`;

// ── 方案 2：Anthropic API 的 tool_use 强制结构化输出 ──
// 使用 tool_use 时，模型被强制输出符合 JSON Schema 的结果
const response = await anthropic.messages.create({
  model: 'claude-opus-4-7',
  tools: [{
    name: 'code_review',
    description: '输出代码审查结果',
    input_schema: {
      type: 'object',
      properties: {
        score: { type: 'number', minimum: 1, maximum: 10 },
        issues: { type: 'array', items: { /* ... */ } },
      },
      required: ['score', 'issues'],
    },
  }],
  tool_choice: { type: 'tool', name: 'code_review' }, // 强制使用此工具
  messages: [{ role: 'user', content: prompt }],
});`;

  const notes = [
    ruleBox('warning', `<strong>Prompt 长度与质量的权衡：</strong>更长的 Prompt 不一定更好——关键是<strong>信噪比</strong>。冗余的描述、重复的约束、不相关的背景会稀释核心指令。原则：每句话都要有信息量，能用示例说明的不用文字描述，能用结构化格式的不用自然语言。`),
    ruleBox('info', `<strong>Temperature 参数的控制：</strong>创意写作用高 temperature（0.7-1.0），代码生成和数据提取用低 temperature（0-0.2）。低 temperature 让模型更确定、更一致，减少随机性带来的幻觉风险。通过 API 调用时务必显式设置，不要依赖默认值。`),
    ruleBox('success', `<strong>Prompt 迭代方法论：</strong>① 写一个基础 Prompt 跑通流程；② 收集 5-10 个失败案例；③ 找共同模式（都在哪种情况下出错）；④ 针对失败模式修改 Prompt 或添加示例；⑤ 重新测试。把 Prompt 当代码管理：版本控制、测试集、评估指标。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('技术概览', techniques)}
    ${section('代码示例', codeBlock('角色设定（Role Prompting）', 'dot-blue', 'javascript', roleCode) + codeBlock('思维链（Chain of Thought）', 'dot-yellow', 'javascript', cotCode) + codeBlock('Few-shot 示例', 'dot-green', 'javascript', fewShotCode) + codeBlock('结构化输出', 'dot-red', 'javascript', structuredCode))}
    ${section('注意事项', notes.join(''))}`);
}
