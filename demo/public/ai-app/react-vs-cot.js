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

  // ── Section 4: 完整链路 trace ────────────────────────────────────────────────

  const traceRows = [
    [1, '需要先查天气才能算指数',           'search_weather', '"上海"',                '上海 明天 22°C，湿度 65%'],
    [2, '拿到温度湿度，可以算指数',       'calculate',      '"22 * 0.9 + 65 * 0.1"', '26.3'],
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

  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    CoT 是<strong>"想"</strong>，ReAct 是<strong>"想了就做、做完再想"</strong>。<br><br>
    <strong>工程默认决策</strong>：<br>
    先问"任务需要外部信息或动作吗？"<br>
    • 需要 → ReAct<br>
    • 不需要 → CoT<br><br>
    别为了用 Agent 而用 Agent。CoT 解决的是"LLM 推理能力不足"，ReAct 解决的是"LLM 信息和行动能力不足"，问题不同，药也不同。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ReAct 是什么 + 三段式格式', reactDefBox + implBox)}
    ${section('LangChain 最简实现', langchainBlock + langchainBox)}
    ${section('完整链路 trace', traceTable + traceBox)}
    ${section('CoT 是什么 + 单走 CoT 的局限', cotBox + cotLimitBox)}
    ${section('ReAct vs CoT 五维对比', compareTable + decisionBox)}
    ${section('选型总结', summaryBox)}`);
}
