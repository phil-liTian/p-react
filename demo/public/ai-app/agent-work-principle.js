function renderAgentWorkPrinciple(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>Agent 工作原理核心结论：LLM + Tools + Loop</strong><br><br>
    Agent 的本质就三件事：<strong>让 LLM 决定做什么 → 调用工具 → 把结果喂回去再决策</strong>，循环直到 LLM 觉得可以给出最终答案。<br><br>
    <strong>LangChain 把这三步封装成 AgentExecutor</strong>：开发者只需定义<strong>工具</strong>和<strong>LLM</strong>，调用 <code>agent.invoke({"input": "..."})</code>，剩下的循环、解析、执行、拼接上下文，LangChain 全包了。<br><br>
    工程上一句话：<code>Agent = LLM 自己决定调哪个 Tool + 一个 while 循环把 Tool 结果喂回 LLM</code>。`);

  // ── Agent 的本质：循环 + 工具 ────────────────────────────────────────────────

  const essenceBox = ruleBox('info',
    `<strong>从一段伪代码理解 Agent</strong><br><br>
    Agent 的核心循环用伪代码写就这么几行：<br>
    <code>while not done:<br>
    &nbsp;&nbsp;action = llm.decide(context)<br>
    &nbsp;&nbsp;if action.is_final_answer:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;return action.answer<br>
    &nbsp;&nbsp;result = tools[action.name].run(action.args)<br>
    &nbsp;&nbsp;context.append(result)</code><br><br>
    这就是 Agent 的全部秘密。LangChain 的 AgentExecutor 把这段伪代码工程化：加上 Prompt 模板、错误处理、日志、记忆、并发控制等。`);

  // ── LangChain 中的 Agent 架构 ────────────────────────────────────────────────

  const archRows = [
    ['AgentExecutor', '调度循环的主入口', '调用 Agent、解析 tool_call、执行 Tool、拼接上下文', '老版核心，新代码推荐用 LangGraph'],
    ['Agent',         'Prompt + LLM 的封装', '决定 LLM 怎么输出 tool_call（ReAct / Function Calling）', '由 create_xxx_agent 工厂函数创建'],
    ['Tools',         '工具列表', 'List[BaseTool]，每个工具有 name / description / args_schema', '工具描述质量直接决定 Agent 效果'],
    ['Memory',        '对话历史', '跨轮次记住用户问过什么、Agent 做过什么', '可选，单轮任务不需要'],
    ['OutputParser',  '解析 LLM 输出', '从文本/JSON 中提取 tool_call（name + args）', 'Function Calling 模式由 SDK 自动解析'],
  ];

  const archTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.6fr 2fr 1.8fr">
        <div class="compare-card-header-cell ai">组件</div>
        <div class="compare-card-header-cell frontend">作用</div>
        <div class="compare-card-header-cell frontend">关键职责</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${archRows.map(([c, r, k, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.6fr 2fr 1.8fr">
        <div class="compare-card-cell ai">${escHtml(c)}</div>
        <div class="compare-card-cell frontend">${escHtml(r)}</div>
        <div class="compare-card-cell frontend">${escHtml(k)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const archBox = ruleBox('success',
    `<strong>对应到贾维斯</strong><br><br>
    • <strong>AgentExecutor</strong> = 贾维斯主控程序（负责调度）<br>
    • <strong>Agent</strong> = 贾维斯的核心 AI（决定下一步做什么）<br>
    • <strong>Tools</strong> = 战甲控制、数据库查询、模拟器等具体能力<br>
    • <strong>Memory</strong> = 贾维斯记得托尼的所有过往指令<br>
    • <strong>OutputParser</strong> = 把"调取数据库"翻译成具体的 API 调用`);

  // ────────────────────────────────────────────────────────────────────────────
  // Tools 调用流程详解（核心）
  // ────────────────────────────────────────────────────────────────────────────

  const flowRows = [
    ['① 用户输入',       'AgentExecutor.invoke({"input": "上海天气？"})',                '触发 Agent 运行'],
    ['② 组装 Prompt',    'System + Tools 描述 + 历史 + User Input',                     '让 LLM 知道有哪些工具可用'],
    ['③ LLM 决策',       'LLM 输出 tool_call: {name: "weather", args: {city: "上海"}}',  'LLM 决定调用哪个工具'],
    ['④ 解析 tool_call', 'AgentExecutor 从 LLM 响应中提取 name 和 args',                'Function Calling 模式由 SDK 自动解析'],
    ['⑤ 参数验证',       '用 args_schema（Pydantic）校验 args',                          '防止 LLM 传错参数'],
    ['⑥ 执行工具',       'Tool.run(args) → 调用真实 API / 函数',                         '产生 Observation'],
    ['⑦ 拼接上下文',     '把 tool_call + tool_result 加回 messages',                    '让 LLM 看到工具返回'],
    ['⑧ 循环',           '回到 ③，LLM 基于新上下文再决策',                               '直到 LLM 不再调用工具'],
    ['⑨ 输出最终答案',   'LLM 给出 Final Answer，AgentExecutor 返回',                   '循环结束'],
  ];

  const flowTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.2fr 2.4fr 1.6fr">
        <div class="compare-card-header-cell desc">阶段</div>
        <div class="compare-card-header-cell ai">关键动作</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${flowRows.map(([s, a, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.2fr 2.4fr 1.6fr">
        <div class="compare-card-cell desc">${escHtml(s)}</div>
        <div class="compare-card-cell ai">${escHtml(a)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const flowBox = ruleBox('warning',
    `<strong>关键点：LLM 不是直接执行代码，而是输出"想调什么工具"</strong><br><br>
    LLM 本身不能调 API、不能执行 Python，它只能<strong>输出文本</strong>。<br>
    Agent 的技巧在于：<strong>用 Prompt 约束 LLM 输出特定格式</strong>（如 JSON <code>{"name": "weather", "args": {"city": "上海"}}</code>），然后 AgentExecutor 解析这个格式，<strong>替 LLM 去执行真正的工具</strong>。<br><br>
    这就是 Function Calling 的本质：<strong>让 LLM 用结构化方式表达"我想调用什么"，把"真正调用"交给宿主代码</strong>。`);

  // ────────────────────────────────────────────────────────────────────────────
  // Tool 定义：三种方式
  // ────────────────────────────────────────────────────────────────────────────

  const toolDefCode = `# ── 方式一：@tool 装饰器（最简，推荐）──────────────────────────
from langchain_core.tools import tool
from pydantic import BaseModel, Field

class WeatherInput(BaseClass):
    city: str = Field(description="城市名，如 '上海'")
    days: int = Field(default=1, description="预报天数")

@tool("weather", args_schema=WeatherInput)
def get_weather(city: str, days: int = 1) -> str:
    """查询指定城市未来 N 天的天气。"""
    return f"{city} 未来 {days} 天：晴，25°C"

# ── 方式二：继承 BaseTool（灵活，适合复杂逻辑）──────────────────
from langchain_core.tools import BaseTool

class StockTool(BaseTool):
    name: str = "stock_price"
    description: str = "查询指定股票的实时价格"
    args_schema: type = StockInput  # Pydantic 类

    def _run(self, ticker: str) -> str:
        return f"{ticker}: $150.25"

    async def _arun(self, ticker: str) -> str:
        return await async_fetch_stock(ticker)

# ── 方式三：StructuredTool.from_function（中间方案）─────────────
from langchain_core.tools import StructuredTool

def search_db(query: str) -> str:
    """在数据库中搜索。"""
    return db.search(query)

search_tool = StructuredTool.from_function(
    search_db,
    name="search_db",
    description="在数据库中搜索",
)`;

  const toolDefBlock = codeBlock('Tool 定义的三种方式', 'dot-blue', 'python', toolDefCode);

  const toolDefBox = ruleBox('info',
    `<strong>Tool 三要素：name + description + args_schema</strong><br><br>
    LLM 看不到工具的实现代码，<strong>只看这三个字段</strong>决定要不要调这个工具：<br>
    • <strong>name</strong>：LLM 输出 tool_call 时用的标识符<br>
    • <strong>description</strong>：告诉 LLM 这个工具能干什么、什么时候该用（最关键！）<br>
    • <strong>args_schema</strong>：Pydantic 类，描述参数名、类型、含义<br><br>
    <strong>实践要点</strong>：description 写得越清楚，Agent 选错工具的概率越低。把"什么时候用"和"什么时候不用"都写进去。`);

  // ────────────────────────────────────────────────────────────────────────────
  // ReAct Prompt 模板
  // ────────────────────────────────────────────────────────────────────────────

  const reactPromptCode = `# ReAct Agent 的 Prompt 模板（核心结构）
template = """Answer the following questions as best you can.
You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original question

Begin!

Question: {input}
Thought:{agent_scratchpad}
"""

# 关键占位符：
# {tools}            - 工具列表（name + description）
# {tool_names}       - 工具名列表（逗号分隔）
# {input}            - 用户输入
# {agent_scratchpad} - 之前的 Thought/Action/Observation 历史`;

  const reactPromptBlock = codeBlock('ReAct Prompt 模板（让 LLM 输出可解析格式）', 'dot-blue', 'text', reactPromptCode);

  const promptBox = ruleBox('warning',
    `<strong>Prompt 是 Agent 的"协议"</strong><br><br>
    Agent 的稳定性高度依赖 Prompt 设计。Function Calling 模式由 SDK 强制 JSON 格式，<strong>稳定</strong>；ReAct 模式靠 LLM 自觉输出 Thought/Action 文本，<strong>易出错</strong>（LLM 可能漏字段、加注释）。<br><br>
    <strong>经验法则</strong>：<br>
    • 模型支持 Function Calling → 用 <code>create_tool_calling_agent</code><br>
    • 不支持的模型 → 用 ReAct，但要写好 Prompt + 加 <code>handle_parsing_errors=True</code><br>
    • 新项目 → 直接用 LangGraph 的 <code>create_react_agent</code>`);

  // ────────────────────────────────────────────────────────────────────────────
  // 完整代码：用 LangChain 实现最小 Agent
  // ────────────────────────────────────────────────────────────────────────────

  const langchainCode = `# 用 LangChain 实现 Agent 的最小完整代码
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool

# ① 定义工具
@tool
def search_weather(city: str) -> str:
    """查询指定城市的实时天气。"""
    return f"{city} 今天晴，25°C，湿度 60%"

@tool
def calculate(expression: str) -> str:
    """执行数学计算，输入表达式字符串，如 '2 + 3 * 4'。"""
    return str(eval(expression))

tools = [search_weather, calculate]

# ② 创建 LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# ③ 创建 Prompt（必须包含 agent_scratchpad 占位符）
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个能调用工具的助手。"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),  # 关键：工具调用历史放这里
])

# ④ 创建 Agent
agent = create_tool_calling_agent(llm, tools, prompt)

# ⑤ 创建 AgentExecutor（负责循环）
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,         # 打印每一步决策
    max_iterations=5,     # 防止死循环
    handle_parsing_errors=True,
)

# ⑥ 运行
result = agent_executor.invoke({
    "input": "上海天气怎么样？算一下气温的两倍是多少"
})
print(result["output"])
# 输出：上海今天 25°C，两倍是 50`;

  const langchainBlock = codeBlock('LangChain Agent 完整代码（create_tool_calling_agent）', 'dot-orange', 'python', langchainCode);

  // ────────────────────────────────────────────────────────────────────────────
  // LangGraph 新方式
  // ────────────────────────────────────────────────────────────────────────────

  const langgraphCode = `# LangChain 新推荐：用 LangGraph 的 create_react_agent
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

@tool
def search_weather(city: str) -> str:
    """查询指定城市的实时天气。"""
    return f"{city} 今天晴，25°C"

@tool
def calculate(expression: str) -> str:
    """执行数学计算。"""
    return str(eval(expression))

llm = ChatOpenAI(model="gpt-4o", temperature=0)

# 一行代码创建 Agent（内置循环、状态管理）
agent = create_react_agent(llm, [search_weather, calculate])

# 调用
result = agent.invoke({
    "messages": [{"role": "user", "content": "上海天气？气温翻倍是？"}]
})
print(result["messages"][-1].content)`;

  const langgraphBlock = codeBlock('LangGraph 版本（推荐新代码用这个）', 'dot-green', 'python', langgraphCode);

  const langgraphBox = ruleBox('success',
    `<strong>LangChain 老版 vs LangGraph 新版</strong><br><br>
    • <strong>老版</strong>：<code>create_tool_calling_agent + AgentExecutor</code>，封装好但难定制<br>
    • <strong>新版</strong>：<code>langgraph.create_react_agent</code>，基于图的状态机，灵活可控<br><br>
    LangChain 官方现在<strong>推荐 LangGraph</strong> 路线，因为它把 Agent 暴露成显式的状态图，方便：调试、加节点（如人工审核）、流式输出、断点续跑。`);

  // ────────────────────────────────────────────────────────────────────────────
  // Tools 调用完整时序
  // ────────────────────────────────────────────────────────────────────────────

  const sequenceCode = `# Tools 调用完整时序（verbose 模式输出）

[User]   "上海天气怎么样？气温两倍是？"
   │
   ▼
[AgentExecutor]
   │  ① 组装 Prompt: system + tools + user input
   ▼
[LLM]  ← 思考：先查天气，再算两倍
   │  ② 返回 tool_call: search_weather(city="上海")
   ▼
[AgentExecutor]
   │  ③ 解析 tool_call，找到 search_weather 工具
   │  ④ 验证 args (Pydantic)
   ▼
[search_weather("上海")]  ← 实际执行
   │  ⑤ 返回: "上海 今天晴，25°C"
   ▼
[AgentExecutor]
   │  ⑥ 拼回 messages: tool_call + tool_result
   ▼
[LLM]  ← 看到天气结果，思考下一步
   │  ⑦ 返回 tool_call: calculate(expression="25 * 2")
   ▼
[AgentExecutor]
   │  ⑧ 解析、验证、执行
   ▼
[calculate("25 * 2")]
   │  ⑨ 返回: "50"
   ▼
[AgentExecutor]
   │  ⑩ 拼回 messages
   ▼
[LLM]  ← 看到所有结果，决定给最终答案
   │  ⑪ 返回 Final Answer（无 tool_call）
   ▼
[AgentExecutor] → 返回: "上海今天 25°C，两倍是 50"`;

  const sequenceBlock = codeBlock('Tools 调用完整时序（verbose 模式）', 'dot-yellow', 'text', sequenceCode);

  // ────────────────────────────────────────────────────────────────────────────
  // LangChain Agent 类型对比
  // ────────────────────────────────────────────────────────────────────────────

  const typeRows = [
    ['create_tool_calling_agent',   '基于模型原生 Function Calling',  'GPT-4o / Claude / Gemini 等支持 tool_call 的模型', '通用、现代标准',     '老版 LangChain 通用方案'],
    ['create_openai_tools_agent',   'OpenAI 专用 Function Calling',  '仅 OpenAI 模型',                                  'OpenAI 模型最优解',  '已被 create_tool_calling_agent 替代'],
    ['create_react_agent (老)',     'ReAct 文本格式（Thought/Action/Observation）', '不支持 Function Calling 的开源模型', '纯文本、兼容性好',   '解析易出错、Token 多'],
    ['create_structured_chat_agent','结构化 JSON 输出',              '需要复杂参数结构的工具',                          '支持多参数工具',     '解析仍依赖 LLM 输出格式'],
    ['langgraph.create_react_agent','基于状态图的 ReAct',            '所有需要 Agent 的场景',                           '官方推荐、可定制',   '学习成本略高'],
  ];

  const typeTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.8fr 1.6fr 1.8fr 1.2fr 1.4fr">
        <div class="compare-card-header-cell ai">工厂函数</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell frontend">适用模型</div>
        <div class="compare-card-header-cell desc">优点</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${typeRows.map(([f, m, mod, p, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.8fr 1.6fr 1.8fr 1.2fr 1.4fr">
        <div class="compare-card-cell ai">${escHtml(f)}</div>
        <div class="compare-card-cell frontend">${escHtml(m)}</div>
        <div class="compare-card-cell frontend">${escHtml(mod)}</div>
        <div class="compare-card-cell desc">${escHtml(p)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  // ────────────────────────────────────────────────────────────────────────────
  // 常见问题与调优
  // ────────────────────────────────────────────────────────────────────────────

  const pitfall1 = ruleBox('danger',
    `<strong>问题一：死循环（Agent 反复调同一个工具）</strong><br><br>
    原因：LLM 没意识到工具已经返回过结果，或工具返回结果不符合 LLM 预期导致它"以为没成功"。<br>
    解决：<br>
    • 设置 <code>max_iterations=5</code>（默认 15，太宽松）<br>
    • 工具 description 写清楚返回值格式<br>
    • 用 <code>return_intermediate_steps=True</code> 看中间步骤<br>
    • 工具失败时返回明确错误信息，而不是空字符串`);

  const pitfall2 = ruleBox('danger',
    `<strong>问题二：选错工具</strong><br><br>
    原因：工具 description 写得太相似，LLM 分不清该用哪个。<br>
    解决：<br>
    • description 写清"<strong>什么时候用</strong>"和"<strong>什么时候不用</strong>"<br>
    • 工具名要有语义（用 <code>search_weather</code> 而不是 <code>tool1</code>）<br>
    • 合并相似工具：天气查询和天气预报可以合并成一个带 <code>days</code> 参数的工具`);

  const pitfall3 = ruleBox('warning',
    `<strong>问题三：参数解析失败</strong><br><br>
    原因：LLM 输出的 args 不符合 schema（如该传 string 传了 number，或缺必填字段）。<br>
    解决：<br>
    • 用 Pydantic <code>args_schema</code> 强制校验<br>
    • 加 <code>handle_parsing_errors=True</code>，解析失败时把错误反馈给 LLM 让它重试<br>
    • schema 里的 Field description 要写清格式（如 "YYYY-MM-DD 格式的日期"）`);

  const pitfall4 = ruleBox('warning',
    `<strong>问题四：Token 爆炸</strong><br><br>
    原因：每次循环都把<strong>所有历史 tool_call + tool_result</strong> 拼回 prompt，长任务下 prompt 越来越长。<br>
    解决：<br>
    • 限制 <code>max_iterations</code><br>
    • 工具返回结果做摘要（如截断长文本）<br>
    • 用 LangGraph 的<strong>消息修剪</strong>（trim_messages）保留最近的 N 条<br>
    • 大结果存到外部存储，工具只返回引用 ID`);

  const pitfall5 = ruleBox('info',
    `<strong>问题五：调试困难</strong><br><br>
    Agent 失败可能是 Prompt、Tool、LLM 任一环节，盲调很痛苦。<br>
    调试三板斧：<br>
    • <code>verbose=True</code>：打印每步决策和工具调用<br>
    • <code>return_intermediate_steps=True</code>：拿到完整步骤链<br>
    • LangSmith：可视化每一步的 prompt、response、tool I/O<br><br>
    <strong>推荐</strong>：开发期开 LangSmith，生产期开 intermediate_steps 日志。`);

  // ────────────────────────────────────────────────────────────────────────────
  // 选型决策
  // ────────────────────────────────────────────────────────────────────────────

  const decisionRows = [
    ['简单工具调用',            'OpenAI Function Calling',  'create_tool_calling_agent',     '稳定、原生支持'],
    ['不支持 FC 的开源模型',    'ReAct 文本解析',           'create_react_agent (老)',       '兼容性好但易出错'],
    ['需要复杂状态/审核',       '状态图',                   'langgraph.create_react_agent',  '官方推荐、可定制'],
    ['多 Agent 协作',           'LangGraph 多节点',         'LangGraph 自定义图',            '灵活但复杂'],
    ['生产环境',                'LangGraph + LangSmith',    'LangGraph + 监控',              '可观测、可调试'],
  ];

  const decisionTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.4fr 1.8fr 1.4fr">
        <div class="compare-card-header-cell desc">场景</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell ai">推荐方案</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${decisionRows.map(([s, m, sol, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.4fr 1.8fr 1.4fr">
        <div class="compare-card-cell desc">${escHtml(s)}</div>
        <div class="compare-card-cell frontend">${escHtml(m)}</div>
        <div class="compare-card-cell ai">${escHtml(sol)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const summaryBox = ruleBox('success',
    `<strong>LangChain Agent 实战总结</strong><br><br>
    <strong>1. 模型选型</strong>：能用 Function Calling 的模型优先用，避免 ReAct 文本解析的脆弱性。<br>
    <strong>2. 工具设计</strong>：name 简短有语义、description 写清使用场景、args_schema 强制校验。<br>
    <strong>3. 循环控制</strong>：必设 max_iterations、必开 verbose、必加 handle_parsing_errors。<br>
    <strong>4. 可观测性</strong>：开发用 LangSmith、生产用 intermediate_steps 日志。<br>
    <strong>5. 新项目首选</strong>：<code>langgraph.create_react_agent</code> + LangSmith 监控。<br><br>
    <strong>核心心智模型</strong>：Agent 不是"更聪明的 LLM"，而是"LLM + while 循环 + 工具集"。把循环、工具、Prompt 三件事都想清楚，Agent 就不会失控。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('Agent 的本质：循环 + 工具', essenceBox)}
    ${section('LangChain 中的 Agent 架构', archTable + archBox)}
    ${section('Tools 调用流程详解', flowTable + flowBox)}
    ${section('Tool 定义：三种方式', toolDefBlock + toolDefBox)}
    ${section('ReAct Prompt 模板', reactPromptBlock + promptBox)}
    ${section('完整代码：LangChain 最小 Agent', langchainBlock)}
    ${section('LangGraph 新方式', langgraphBlock + langgraphBox)}
    ${section('Tools 调用完整时序', sequenceBlock)}
    ${section('LangChain Agent 类型对比', typeTable)}
    ${section('常见问题与调优', pitfall1 + pitfall2 + pitfall3 + pitfall4 + pitfall5)}
    ${section('选型决策', decisionTable + summaryBox)}`);
}
