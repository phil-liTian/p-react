# ReAct 完整链路 vs CoT 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `demo/ai-app.html` 知识库的 🤖 Agent 分组末尾新增一个 topic「ReAct 完整链路 vs CoT」，用 LangChain 最简实现讲清 ReAct 完整链路，并对比 ReAct 与 CoT 的区别。

**Architecture:** 单文件渲染函数 `renderReactVsCot(t)`，复用 `data.js` 全局 helper（ruleBox / codeBlock / compareCard / section / articleShell / escHtml），按现有 `what-is-agent.js` 的写法组织。topic 元信息追加到 `data.js` 的 `topics` 数组末尾，sidebar 自动渲染。

**Tech Stack:** Vanilla JS（script 标签全局挂载）、LangChain Python（仅在 code block 中展示给读者）、highlight.js 语法高亮、Vite dev server。

## Global Constraints

- 项目无测试框架，验证方式为浏览器手动验证（参考 `CLAUDE.md` "无测试脚本，在 demo/ 目录下的 .ts 文件中手动验证实现"）。
- 自然语言全部用中文（参考 `~/.claude/skills/session-rules/SKILL.md`）。
- 函数命名遵循 `data.js` 已有约定：渲染函数命名为 `renderReactVsCot`（与 `app.js` 的 `getRendererName('react-vs-cot')` 自动匹配）。
- 不执行 `git commit` / `git push`（参考 `session-rules`）：计划中标注的 commit 步骤由用户本人执行。
- 复用 `data.js` 全局 helper，不新建 helper、不动 `ai-app.html` 样式、不动 `vite.config.ts`。
- 贯穿示例统一为「查上海明天天气 + 算体感指数（温度 × 0.9 + 湿度 × 0.1）」，在 Section 3 和 Section 4 中复用。

## File Structure

| 文件 | 责任 | 改动 |
|---|---|---|
| `demo/public/ai-app/data.js` | topic 元信息 + 共享 helper | 追加 1 个 topic 对象到 `topics` 数组末尾 |
| `demo/public/ai-app/react-vs-cot.js` | 渲染 `renderReactVsCot(t)` | 新建，7 个 section |

`app.js` 的懒加载机制会自动识别新 topic：`getRendererName('react-vs-cot')` → `renderReactVsCot`，脚本路径 `/ai-app/react-vs-cot.js`。无需改 `app.js` / `ai-app.html` / `vite.config.ts`。

---

### Task 1: 追加 topic 元信息到 data.js

**Files:**
- Modify: `demo/public/ai-app/data.js`（在 `topics` 数组末尾、`agent-work-principle` 对象之后追加）

**Interfaces:**
- Produces: `topics` 数组新增一项 `id='react-vs-cot'`，被 `app.js` 的 sidebar 渲染循环和懒加载机制消费。

- [ ] **Step 1: 追加 topic 对象**

在 `demo/public/ai-app/data.js` 的 `topics` 数组中，紧接 `agent-work-principle` 对象之后追加：

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
  },
```

注意：保留数组末尾的 `];` 结尾，不要破坏其他 topic 对象。

- [ ] **Step 2: 启动 dev server 并验证 sidebar**

Run: `pnpm dev`
打开: `http://localhost:5173/ai-app.html`
Expected: 左侧 sidebar「🤖 Agent」分组底部出现「🔁 ReAct 完整链路 vs CoT」条目。点击会触发懒加载 `/ai-app/react-vs-cot.js`，此时文件还不存在，浏览器 console 会有 404 报错 —— 这是预期行为，下一 Task 解决。

- [ ] **Step 3: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/data.js && git commit -m "feat(ai-app): 新增 ReAct vs CoT topic 元信息"`

---

### Task 2: 创建 react-vs-cot.js 骨架 + Section 1-2

**Files:**
- Create: `demo/public/ai-app/react-vs-cot.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper（`ruleBox` / `section` / `articleShell` / `escHtml`）
- Produces: 全局函数 `renderReactVsCot(t)`，被 `app.js` 通过 `window[getRendererName(id)]` 调用

- [ ] **Step 1: 创建文件，写入函数骨架 + Section 1（核心结论）+ Section 2（ReAct 是什么）**

写入 `demo/public/ai-app/react-vs-cot.js`：

```js
function renderReactVsCot(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：ReAct = CoT + 工具调用循环</strong><br><br>
    CoT 让 LLM <strong>"想清楚"</strong>，ReAct 让 LLM <strong>"想清楚 → 做一步 → 看结果 → 再想"</strong>，本质是给 CoT 加了"行动 + 观察"两条腿。<br><br>
    <strong>类比</strong>：CoT 像<strong>闭卷推理</strong>，只能凭脑子里的知识推；ReAct 像<strong>开卷 + 能查资料 + 能动手</strong>，遇到不会的可以翻书、可以计算、可以问别人。<br><br>
    工程上一句话：<code>ReAct 把 CoT 的"想"切成多段，每段之间插入 Action（调用工具）和 Observation（工具返回），让 LLM 的推理能基于真实世界反馈</code>。`);

  // ── Section 2: ReAct 是什么 + 三段式格式 ─────────────────────────────────────

  const reactDefBox = ruleBox('info',
    `<strong>ReAct = Reasoning + Acting</strong><br><br>
    2022 年 Yao 等人论文提出，让 LLM 交替进行<strong>推理（Reasoning）</strong>和<strong>行动（Acting）</strong>。<br><br>
    三段式循环：<br>
    <code>Thought → Action → Observation → Thought → Action → ... → Final Answer</code><br><br>
    • <strong>Thought</strong>：根据当前目标和已知信息，思考下一步<br>
    • <strong>Action</strong>：调用工具（带 Action Input）<br>
    • <strong>Observation</strong>：工具返回的结果，作为下一轮 Thought 的输入<br>
    • <strong>Final Answer</strong>：LLM 自己判断信息够了，输出最终答案，循环终止`);

  const implBox = ruleBox('warning',
    `<strong>LangChain 中的两种实现</strong><br><br>
    ① 老式 <code>create_react_agent</code>：纯文本解析，LLM 自觉输出 <code>Thought: ... Action: ... Observation: ...</code> 格式，<strong>易出错</strong>（漏字段、加注释、格式飘了）<br>
    ② 新式 <code>create_tool_calling_agent</code>：基于 Function Calling，SDK 强制 JSON 格式，<strong>稳定</strong>，官方推荐<br><br>
    下面示例用第二种。但 trace 部分会用文本格式展示，便于看清循环结构。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ReAct 是什么 + 三段式格式', reactDefBox + implBox)}`);
}
```

- [ ] **Step 2: 浏览器验证 Section 1-2 渲染**

刷新 `http://localhost:5173/ai-app.html`，点击 sidebar 中的「ReAct 完整链路 vs CoT」。
Expected:
- 文章区显示标题「ReAct 完整链路 vs CoT」+ 4 个 tag
- 显示 2 个 section：「核心结论」（紫色 ruleBox）和「ReAct 是什么 + 三段式格式」（蓝色 + 黄色两个 ruleBox）
- 浏览器 console 无 JS 报错

- [ ] **Step 3: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/react-vs-cot.js && git commit -m "feat(ai-app): 新增 react-vs-cot.js 骨架 + Section 1-2"`

---

### Task 3: 添加 Section 3（LangChain 最简实现）

**Files:**
- Modify: `demo/public/ai-app/react-vs-cot.js`（在 Section 2 之后、`return` 之前插入 Section 3 内容；同时更新 `return` 的 articleShell）

**Interfaces:**
- Consumes: `data.js` 全局 helper `codeBlock`

- [ ] **Step 1: 在 `return articleShell` 之前插入 Section 3 变量**

在 `implBox` 声明之后、`return articleShell` 之前插入：

```js
  // ── Section 3: LangChain 最简实现 ────────────────────────────────────────────

  const langchainCode = `# 用 LangChain 实现一个最小可运行的 ReAct Agent
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool

# ① 定义工具（docstring 即工具描述，LLM 看到的就是它）
@tool
def search_weather(city: str) -> str:
    """查询指定城市的实时天气。"""
    return f"{city} 明天 22°C，湿度 65%"

@tool
def calculate(expression: str) -> str:
    """执行数学计算，输入表达式字符串，如 '22 * 0.9 + 65 * 0.1'。"""
    return str(eval(expression))

tools = [search_weather, calculate]

# ② 创建 LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# ③ 创建 Prompt（必须包含 agent_scratchpad 占位符）
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个能调用工具的 Agent。"),
    ("user", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

# ④ 创建 Agent + Executor
agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# ⑤ 运行
result = agent_executor.invoke({
    "input": "查上海明天天气，并按 温度×0.9 + 湿度×0.1 算体感指数"
})
print(result["output"])`;

  const langchainBlock = codeBlock('LangChain ReAct Agent 最简实现', 'dot-orange', 'python', langchainCode);

  const langchainBox = ruleBox('info',
    `<strong>三要素：tools + prompt with scratchpad + AgentExecutor</strong><br><br>
    • <strong>tools</strong>：用 <code>@tool</code> 装饰器定义，docstring 即工具描述（LLM 看到的就是它）<br>
    • <strong>prompt</strong>：必须包含 <code>{agent_scratchpad}</code> 占位符，LangChain 在这里填入历史 Thought/Action/Observation<br>
    • <strong>AgentExecutor</strong>：循环引擎，调用 Agent → 解析 tool_call → 执行 Tool → 把结果塞回 prompt → 再调用 Agent，直到输出 Final Answer<br><br>
    <code>verbose=True</code> 会打印每一步的 Thought/Action/Observation，调试时必开。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 3**

把 `return articleShell(t, ...)` 改为：

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ReAct 是什么 + 三段式格式', reactDefBox + implBox)}
    ${section('LangChain 最简实现', langchainBlock + langchainBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 3 渲染**

刷新页面，重新点击「ReAct 完整链路 vs CoT」。
Expected:
- 第 3 个 section「LangChain 最简实现」出现
- Python 代码块语法高亮正常（关键字、字符串、装饰器着色）
- 代码块顶部有橙色圆点 + 标签「LangChain ReAct Agent 最简实现」
- 代码块下方是蓝色 ruleBox「三要素」说明

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/react-vs-cot.js && git commit -m "feat(ai-app): 添加 ReAct vs CoT Section 3 LangChain 实现"`

---

### Task 4: 添加 Section 4（完整链路 trace 表）

**Files:**
- Modify: `demo/public/ai-app/react-vs-cot.js`（在 Section 3 之后插入 Section 4，更新 `return`）

**Interfaces:**
- Consumes: `data.js` 全局 helper `ruleBox`；内联 5 列 HTML table（仿 `what-is-agent.js` 的 `threeTable` 写法，因为 `compareCard` helper 只支持 3 列）

- [ ] **Step 1: 在 `langchainBox` 之后插入 Section 4 变量**

```js
  // ── Section 4: 完整链路 trace ────────────────────────────────────────────────

  const traceRows = [
    [1, '需要先查天气才能算指数',           'search_weather', '"上海"',                '上海 明天 22°C，湿度 65%'],
    [2, '拿到温度湿度，可以代入公式算指数', 'calculate',      '"22 * 0.9 + 65 * 0.1"', '26.3'],
    [3, '已得答案，可以输出最终结果',       'Final Answer',   '—',                     '—'],
  ];

  const traceTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 0.5fr 2fr 1.2fr 1.5fr 2fr">
        <div class="compare-card-header-cell desc">Step</div>
        <div class="compare-card-header-cell ai">Thought</div>
        <div class="compare-card-header-cell frontend">Action</div>
        <div class="compare-card-header-cell frontend">Action Input</div>
        <div class="compare-card-header-cell desc">Observation</div>
      </div>
      ${traceRows.map(([s, th, a, ai, o]) => `
      <div class="compare-card-row" style="grid-template-columns: 0.5fr 2fr 1.2fr 1.5fr 2fr">
        <div class="compare-card-cell desc">${escHtml(String(s))}</div>
        <div class="compare-card-cell ai">${escHtml(th)}</div>
        <div class="compare-card-cell frontend">${escHtml(a)}</div>
        <div class="compare-card-cell frontend">${escHtml(ai)}</div>
        <div class="compare-card-cell desc">${escHtml(o)}</div>
      </div>`).join('')}
    </div>`;

  const traceBox = ruleBox('success',
    `<strong>循环终止条件：LLM 自己判断信息够了</strong><br><br>
    Agent 不会被告知"做几步"，而是每轮 LLM 自己决定：<strong>继续调工具</strong>还是<strong>输出 Final Answer</strong>。<br><br>
    这意味着 Agent 的步数是动态的 —— 简单问题可能 1 步出答案，复杂问题可能 10+ 步。<br>
    工程上设 <code>max_iterations</code> 兜底，防止 LLM 陷入死循环。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 4**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ReAct 是什么 + 三段式格式', reactDefBox + implBox)}
    ${section('LangChain 最简实现', langchainBlock + langchainBox)}
    ${section('完整链路 trace', traceTable + traceBox)}`);
```

- [ ] **Step 3: 浏览器验证 trace 表渲染**

刷新页面。
Expected:
- 第 4 个 section「完整链路 trace」出现
- 5 列表格正常渲染，3 行数据，每行 Step / Thought / Action / Action Input / Observation 对齐
- 表格在桌面宽度下不溢出；浏览器窗口缩到 ~900px 以下时表格列宽自适应（CSS 已有 `.code-blocks-row` 媒体查询，但 compare-card 自身没有；只要不溢出即可）
- 绿色 ruleBox「循环终止条件」正常显示

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/react-vs-cot.js && git commit -m "feat(ai-app): 添加 ReAct vs CoT Section 4 trace 表"`

---

### Task 5: 添加 Section 5-6（CoT 局限 + 五维对比）

**Files:**
- Modify: `demo/public/ai-app/react-vs-cot.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper `compareCard`（3 列对比表，正合适）

- [ ] **Step 1: 在 `traceBox` 之后插入 Section 5 + Section 6 变量**

```js
  // ── Section 5: CoT 是什么 + 单走 CoT 的局限 ──────────────────────────────────

  const cotBox = ruleBox('info',
    `<strong>CoT = Chain of Thought（思维链）</strong><br><br>
    Prompt 里加一句 <code>"Let's think step by step"</code>，LLM 就会把推理过程写出来，而不是直接给答案。<br><br>
    <strong>典型 Prompt</strong>：<br>
    <code>Q: 一个商品原价 200 元，先打 8 折，再用 30 元优惠券，最终多少钱？<br>
    A: Let's think step by step.</code><br><br>
    <strong>LLM 输出</strong>：<br>
    ① 打 8 折后是 200 × 0.8 = 160 元<br>
    ② 减 30 元优惠券是 160 - 30 = 130 元<br>
    ③ 答案是 130 元<br><br>
    对纯推理任务，CoT 让正确率从 30% 提升到 80%+。`);

  const cotLimitBox = ruleBox('danger',
    `<strong>单走 CoT 的三大局限</strong><br><br>
    ① <strong>拿不到实时信息</strong>：问"今天 A 股大盘如何"，CoT 只能瞎猜或承认不知道，因为它只有训练数据<br>
    ② <strong>不能动手</strong>：问"帮我算 123 × 456"，CoT 会输出推理过程，但<strong>可能算错</strong>，且不会调用 Python 真算<br>
    ③ <strong>不可验证</strong>：推理错了没有外部反馈，LLM 自己不知道错，下一步也基于错的继续推<br><br>
    本质：CoT 是<strong>闭卷考试</strong>，能力上限是 LLM 训练时见过的知识。`);

  // ── Section 6: ReAct vs CoT 五维对比 ─────────────────────────────────────────

  const compareRows = [
    ['核心机制',     '纯文本推理链',                '推理 + 工具调用循环'],
    ['外部信息',     '无，仅靠训练数据',            '有，通过 Action 调用工具获取'],
    ['可验证性',     '无，错了不知道',              '有，Observation 反馈给 LLM'],
    ['成本/延迟',    '低（1 次 LLM 调用）',         '高（N 次 LLM + N 次工具）'],
    ['适用场景',     '数学/逻辑推理、写作',         '需要外部信息或操作的开放任务'],
  ];
  const compareTable = compareCard(compareRows, ['CoT', 'ReAct']);

  const decisionBox = ruleBox('warning',
    `<strong>选型决策</strong><br><br>
    • 纯推理任务（数学题、逻辑题）→ <strong>用 CoT</strong>，成本是 ReAct 的 1/10，且 ReAct 在这里无工具可调<br>
    • 涉及实时信息、工具调用、可验证步骤 → <strong>用 ReAct</strong>，CoT 在这里会瞎编<br>
    • <strong>混合策略</strong>：ReAct 做主循环，每个 Action 内部可以让 LLM 先 CoT 推理再决策<br><br>
    反例：用 ReAct 做"两数相乘"（LLM 自己会算），白白多花 5 倍 Token；用 CoT 做"今天天气"，必定瞎编。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 5-6**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ReAct 是什么 + 三段式格式', reactDefBox + implBox)}
    ${section('LangChain 最简实现', langchainBlock + langchainBox)}
    ${section('完整链路 trace', traceTable + traceBox)}
    ${section('CoT 是什么 + 单走 CoT 的局限', cotBox + cotLimitBox)}
    ${section('ReAct vs CoT 五维对比', compareTable + decisionBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 5-6 渲染**

刷新页面。
Expected:
- 第 5 个 section「CoT 是什么 + 单走 CoT 的局限」出现，含蓝色 + 红色两个 ruleBox
- 第 6 个 section「ReAct vs CoT 五维对比」出现，含 3 列对比表（维度 / CoT / ReAct，5 行数据）+ 黄色 ruleBox
- 对比表表头：第一列「维度」灰色，第二列「CoT」蓝色，第三列「ReAct」紫色

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/react-vs-cot.js && git commit -m "feat(ai-app): 添加 ReAct vs CoT Section 5-6 CoT 局限与五维对比"`

---

### Task 6: 添加 Section 7（选型总结）+ 全量验证

**Files:**
- Modify: `demo/public/ai-app/react-vs-cot.js`

- [ ] **Step 1: 在 `decisionBox` 之后插入 Section 7 变量**

```js
  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    CoT 是<strong>"想"</strong>，ReAct 是<strong>"想了就做、做完再想"</strong>。<br><br>
    <strong>工程默认决策</strong>：<br>
    先问"任务需要外部信息或动作吗？"<br>
    • 需要 → ReAct<br>
    • 不需要 → CoT<br><br>
    别为了用 Agent 而用 Agent。CoT 解决的是"LLM 推理能力不足"，ReAct 解决的是"LLM 信息和行动能力不足"，问题不同，药也不同。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 7**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ReAct 是什么 + 三段式格式', reactDefBox + implBox)}
    ${section('LangChain 最简实现', langchainBlock + langchainBox)}
    ${section('完整链路 trace', traceTable + traceBox)}
    ${section('CoT 是什么 + 单走 CoT 的局限', cotBox + cotLimitBox)}
    ${section('ReAct vs CoT 五维对比', compareTable + decisionBox)}
    ${section('选型总结', summaryBox)}`);
```

- [ ] **Step 3: 桌面端全量验证**

刷新 `http://localhost:5173/ai-app.html`，点击「ReAct 完整链路 vs CoT」。
Expected:
- 7 个 section 按顺序渲染：核心结论 / ReAct 是什么 / LangChain 实现 / trace 表 / CoT 局限 / 五维对比 / 选型总结
- 顶部 content-header 显示「🔁 AI 应用开发 · ReAct 完整链路 vs CoT」，右侧 badge 显示「🤖 Agent」
- LangChain 代码块语法高亮正常
- trace 表 5 列对齐、3 行数据
- 五维对比表 3 列、5 行数据
- 浏览器 console 无 JS 报错（含 404）

- [ ] **Step 4: 切换 topic 验证无副作用**

依次点击 sidebar 中的其他 4 个 topic（不用 RAG 全塞上下文 / RAG 原理 / 什么是 Agent / Agent 工作原理），再切回「ReAct 完整链路 vs CoT」。
Expected: 每个 topic 都能正常渲染，切换不报错，新 topic 渲染状态在切换后保留（懒加载缓存机制）。

- [ ] **Step 5: 移动端窄屏验证**

打开浏览器开发者工具，切到移动端模拟（iPhone 12 / 375px 宽度），刷新页面。
Expected:
- 顶部出现汉堡菜单按钮，sidebar 默认隐藏
- 点击汉堡菜单，sidebar 从左滑出，「🤖 Agent」分组底部仍有「ReAct 完整链路 vs CoT」
- 点击进入后，文章区单列布局，trace 表 5 列在 375px 下可能略挤但不溢出（如溢出，CSS 不在本计划范围内，记录后续优化）
- ruleBox / code block 自适应窄屏

- [ ] **Step 6: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/react-vs-cot.js && git commit -m "feat(ai-app): 添加 ReAct vs CoT Section 7 选型总结，完成新 topic"`

---

## Self-Review

**1. Spec coverage:**
- 主题元信息（group=🤖 Agent 末尾、id=react-vs-cot、4 个 tag）→ Task 1 ✓
- 7 个 section 全部覆盖 → Task 2 (S1-2) / Task 3 (S3) / Task 4 (S4) / Task 5 (S5-6) / Task 6 (S7) ✓
- LangChain 最简实现（贯穿示例：上海天气 + 体感指数）→ Task 3 ✓，且 trace 表在 Task 4 复用同一示例 ✓
- ReAct vs CoT 五维对比表 → Task 5 ✓
- 文件改动清单（新建 react-vs-cot.js / 修改 data.js / 不动其他）→ 全部对齐 ✓
- 验证方式（pnpm dev + 浏览器 + 移动端）→ Task 6 Step 3-5 ✓

**2. Placeholder scan:**
- 无 TBD / TODO / "适当处理" / "类似上面" 等占位 ✓
- 每个 code block 都是完整可粘贴的代码 ✓
- 每个验证步骤都有具体 Expected 描述 ✓

**3. Type consistency:**
- `renderReactVsCot` 函数名贯穿 Task 1（id 推导）/ Task 2（创建）/ 与 `app.js` 的 `getRendererName('react-vs-cot')` 匹配 ✓
- 全局 helper 名（`ruleBox` / `codeBlock` / `compareCard` / `section` / `articleShell` / `escHtml`）与 `data.js` 定义一致 ✓
- `traceRows` 数组结构（5 元组）与 `traceTable` 模板解构一致 ✓
- `compareRows` 数组结构（3 元组）与 `compareCard` 的 `rows.map(([fe, ai, desc]) => ...)` 一致 ✓

无问题。

## Execution Handoff

计划已保存到 `docs/superpowers/plans/2026-08-03-react-vs-cot.md`。两种执行方式：

**1. Subagent-Driven（推荐）** - 每个 Task 派一个新 subagent 执行，Task 之间我做 review，迭代快、上下文干净。

**2. Inline Execution** - 在当前会话直接执行，批量跑 + checkpoint review。

你选哪种？
