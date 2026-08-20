# ReAct 完整链路 vs CoT — 设计文档

## 背景

`demo/ai-app.html` 是 AI 应用开发知识库，现有 4 个 topic（RAG 相关 2 个、Agent 相关 2 个）。Agent 相关 topic 中已多次提到 ReAct，但都是作为 Agent 的工作模式简述，没有展开 ReAct 自身的完整链路；CoT（Chain of Thought）也只在 `what-is-agent.js` 的"规划组件"一行带过。

用户希望新增一个 topic：用 LangChain 做一个最简 ReAct 实现，并总结 ReAct 与 CoT 的区别。叙事重点是"重 ReAct、轻 CoT"——ReAct 完整链路占主体，CoT 作为对照基准简述。

## 目标

新增一个 topic，让读者看完后能：

1. 说清 ReAct 的 Thought / Action / Observation 三段式循环
2. 看懂一段可运行的 LangChain 最简 ReAct 实现
3. 跟着一次完整 trace 看清"一次循环到底发生了什么"
4. 说清 CoT 是什么、为什么单走 CoT 不够
5. 用一张五维对比表说清 ReAct 与 CoT 的区别和选型

## 方案

采用方案 A：链路拆解 + 范式对比。全文围绕"一次 ReAct 完整链路"展开，CoT 作为对照基准在后半部分出现，最后以五维对比表和选型决策收束。

不选方案 B（痛点驱动）的原因：CoT 部分会偏负面定位，与"总结区别"的中性诉求不符。
不选方案 C（代码优先）的原因：学习曲线陡，新手不友好。

## 主题元信息

追加到 `demo/public/ai-app/data.js` 的 `topics` 数组末尾：

```js
{
  id: 'react-vs-cot',
  name: 'ReAct 完整链路 vs CoT',
  group: '🤖 Agent',
  type: 'accent',
  icon: '🔁',
  tags: [
    { label: 'ReAct', type: 'accent' },
    { label: 'CoT', type: 'info' },
    { label: 'Thought/Action/Observation', type: 'success' },
    { label: 'LangChain', type: 'warning' },
  ],
}
```

分组放在 `🤖 Agent` 末尾，紧接现有的 `agent-work-principle`，让读者按"什么是 Agent → Agent 工作原理 → ReAct vs CoT"的顺序自然读下来。

## 文件骨架

新建 `demo/public/ai-app/react-vs-cot.js`，导出 `renderReactVsCot(t)`。复用 `data.js` 全局 helper：`ruleBox / codeBlock / compareCard / section / articleShell / escHtml / tagsHtml`，无需 import。

7 个 section：

### Section 1：核心结论（ruleBox-accent）

- 一句话结论：**ReAct = CoT + 工具调用循环**。CoT 让 LLM"想清楚"，ReAct 让 LLM"想清楚 → 做一步 → 看结果 → 再想"，本质是给 CoT 加了"行动 + 观察"两条腿。
- 类比：CoT 像"闭卷推理"，ReAct 像"开卷 + 能查资料 + 能动手"。

### Section 2：ReAct 是什么 + 三段式格式

- ReAct = Reasoning + Acting（2022 年 Yao 等人论文）
- 三段式循环：`Thought → Action → Observation → Thought → ... → Final Answer`
- LangChain 中 ReAct 的两种实现：①老式 `create_react_agent`（纯文本解析）②新式 `create_tool_calling_agent`（Function Calling，官方推荐）
- ruleBox-warning：ReAct 文本格式靠 LLM 自觉输出，易解析失败；FC 模式由 SDK 强制 JSON，更稳。

### Section 3：LangChain 最简实现（贯穿示例）

任务：查上海明天天气 + 算体感指数（温度 × 0.9 + 湿度 × 0.1）。

codeBlock-python（~40 行可运行代码）：

- `@tool` 定义 `search_weather(city)` 和 `calculate(expression)`
- `ChatPromptTemplate` 带 `agent_scratchpad` 占位符
- `create_tool_calling_agent` + `AgentExecutor`
- `agent.invoke({"input": "..."})`

ruleBox-info：三要素说明（tools / prompt with scratchpad / AgentExecutor 是循环引擎）。

### Section 4：完整链路 trace

用 HTML table 展示 Agent 解"上海明天天气如何，并算下体感指数（温度 × 0.9 + 湿度 × 0.1）"的全过程：

| Step | Thought | Action | Action Input | Observation |
|---|---|---|---|---|
| 1 | 需要先查天气再算指数 | search_weather | "上海" | 上海明天 22°C，湿度 65% |
| 2 | 拿到温度湿度，可以算指数 | calculate | "22 * 0.9 + 65 * 0.1" | 26.3 |
| 3 | 已得答案 | —（Final Answer）| — | — |

ruleBox-success：点明循环终止条件 = LLM 自己判断信息够了、输出 Final Answer。

### Section 5：CoT 是什么 + 单走 CoT 的局限

- CoT = Chain of Thought，"Let's think step by step"那个 trick
- 优点：纯推理任务（数学、逻辑）大幅提升正确率
- 局限（ruleBox-danger）：
  - **拿不到实时信息**：问"今天 A 股"它只能瞎猜
  - **不能动手**：问"帮我算下这个表达式"它输出文字而非结果
  - **不可验证**：推理错了，没有外部反馈纠正
  - 即"闭卷考试"的天花板

### Section 6：ReAct vs CoT 五维对比表 + 决策 box

compareCard 五行：

| 维度 | CoT | ReAct |
|---|---|---|
| 核心机制 | 纯文本推理链 | 推理 + 工具调用循环 |
| 外部信息 | 无 | 有（通过 Action）|
| 可验证性 | 无（错了不知道）| 有（Observation 反馈）|
| 成本/延迟 | 低 | 高（多轮 LLM + 工具）|
| 适用场景 | 数学/逻辑推理 | 需要外部信息或操作的开放任务 |

ruleBox-warning 选型决策：纯推理用 CoT（成本 1/10）；涉及实时信息、工具调用、可验证步骤用 ReAct；混合策略：CoT 做局部推理，ReAct 做主循环。

### Section 7：选型总结（ruleBox-success）

- 一句话收束：CoT 是"想"，ReAct 是"想了就做、做完再想"。
- 工程默认：先问"任务需要外部信息或动作吗"，需要 → ReAct，不需要 → CoT，别为了用 Agent 而用 Agent。

## 实施细节

### 文件改动清单

1. **新建** `demo/public/ai-app/react-vs-cot.js`
   - 导出 `renderReactVsCot(t)`，按 `what-is-agent.js` 的写法组织（顶部声明各 section 变量，底部 `return articleShell(t, ...)`）
   - 复用 `data.js` 全局 helper
   - 代码块语言：`python`（LangChain 实现）、`text`（trace 表用 HTML table 而非 code block）

2. **修改** `demo/public/ai-app/data.js`
   - 在 `topics` 数组末尾追加新 topic 对象（元信息见上）
   - 不动其他 topic

3. **无需改动**：
   - `ai-app.html`：sidebar 由 `data.js` 动态渲染，新 topic 自动出现
   - `app.js`：`getRendererName('react-vs-cot')` → `renderReactVsCot`，懒加载脚本路径 `/ai-app/react-vs-cot.js` 自动匹配
   - `vite.config.ts`：`public/` 下文件不进 rollup input，无需登记

### 验证方式

1. `pnpm dev` 启动 Vite
2. 浏览器打开 `http://localhost:5173/ai-app.html`
3. 左侧 sidebar 的"🤖 Agent"分组底部应出现"ReAct 完整链路 vs CoT"
4. 点击进入，确认：
   - 7 个 section 按顺序渲染
   - LangChain 代码块语法高亮正常（hljs 自动处理）
   - trace 表格在窄屏下不溢出
   - 与现有 4 个 topic 切换正常，无 JS 报错
5. 移动端窄屏（< 700px）下 sidebar 折叠正常

### 不做的事（YAGNI）

- 不写单元测试（项目无测试脚本，demo 都是手动验证）
- 不动 `global-topics.js`（那是 hub 首页的全局索引，ai-app 内部 topic 不进 hub）
- 不改 `ai-app.html` 的样式
- 不为 CoT 单独建 topic（用户明确"重 ReAct 轻 CoT"，CoT 作为对比维度出现即可）

## 依赖关系

- 新 topic 与现有 4 个 topic 互不依赖，可在不动现有代码的前提下增量添加。
- 新 topic 文件命名遵循 `app.js` 的懒加载约定（`getRendererName` 把 `react-vs-cot` → `renderReactVsCot`，脚本路径 `/ai-app/react-vs-cot.js`）。
