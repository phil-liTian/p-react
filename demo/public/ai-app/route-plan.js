function renderRoutePlan(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：Route Plan（规划执行）= 先规划完整路线，再按计划执行</strong><br><br>
    Route Plan 是 Agent 的<strong>"先想清楚再动手"</strong>模式 —— 把复杂任务拆成有序步骤，一次规划、顺序执行。<br><br>
    与 ReAct 的<strong>"走一步看一步"</strong>形成对比：ReAct 每步都重新思考，Route Plan 一次性规划全局路线。<br><br>
    工程上一句话：<code>用户输入 → Planner 生成步骤列表 → Executor 顺序执行每步 → （可选）Re-planner 调整计划 → 输出答案</code>。<br><br>
    没有全局规划，Agent 在长任务中容易跑偏 —— 走到一半才发现方向错了。`);

  // ── Section 2: 场景切入 + 贯穿示例 ───────────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：策划一次北京 3 日团建</strong><br><br>
    用户输入：「帮我策划下周三到周五的北京团建，8 个人，预算 2 万」<br><br>
    <strong>ReAct 做法</strong>（走一步看一步）：<br>
    ① 查北京下周三天气 → ② 想想该订什么机票 → ③ 查机票 → ④ 想想酒店 → ⑤ 查酒店 → ⑥ 想想景点 → ...<br><br>
    <strong>Route Plan 做法</strong>（先想清楚再动手）：<br>
    Planner 先生成完整计划：<br>
    <code>[查天气, 订往返机票, 订酒店, 排日程, 估算预算, 输出方案]</code><br>
    然后顺序执行每一步，执行器只管"做完一步、返回结果、进下一步"。`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>ReAct 在长任务中的三大问题</strong><br><br>
    ① <strong>缺全局视角</strong>：每步只看当前观察，可能订完机票才发现酒店超预算<br>
    ② <strong>Token 浪费</strong>：N 步任务 = N 次 LLM 调用，每次都要重新读历史 + 思考"下一步干嘛"<br>
    ③ <strong>累计误差</strong>：第 2 步走偏了，第 3 步基于错误前提继续，越走越远<br><br>
    本质：ReAct 是<strong>反应式</strong>（reactive），缺少<strong>前瞻式</strong>（proactive）规划。`);

  // ── Section 3: Plan-and-Execute 三段式架构 ───────────────────────────────────

  const archBox = ruleBox('info',
    `<strong>Plan-and-Execute 三组件</strong><br><br>
    ① <strong>Planner（规划器）</strong>：LLM 一次性生成步骤列表，每步是一个子任务描述<br>
    ② <strong>Executor（执行器）</strong>：逐个执行步骤，可以是工具调用 / 子 Agent / 子 LLM<br>
    ③ <strong>Re-planner（重规划器，可选）</strong>：执行完一步后判断是否需要调整后续计划（如预算超了，砍掉某个景点）<br><br>
    <strong>关键特征</strong>：Planner 和 Executor <strong>解耦</strong> —— Planner 只负责"想"，Executor 只负责"做"，各自可用不同模型 / prompt。<br><br>
    常见变体：用便宜小模型做 Executor（执行简单步骤），用贵模型做 Planner（规划需要强推理）。`);

  // ── Section 4: LangChain / LangGraph 实现 ───────────────────────────────────

  const langchainCode = `# LangGraph 实现 Plan-and-Execute（官方推荐）
# 来源：LangGraph 官方 plan-and-execute 模板
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import List

# ① 用 Pydantic 定义 Plan 结构（强制 LLM 输出结构化计划）
class PlanStep(BaseModel):
    description: str = Field(description="这一步要做什么")

class Plan(BaseModel):
    steps: List[PlanStep] = Field(description="有序步骤列表")

planner_llm = ChatOpenAI(model="gpt-4o", temperature=0)
planner = planner_llm.with_structured_output(Plan)

def plan_node(state):
    """规划节点：一次性生成完整步骤列表"""
    plan = planner.invoke(
        f"把以下任务拆成有序步骤：\\n{state['input']}"
    )
    return {"plan": plan.steps, "step_idx": 0}

def execute_node(state):
    """执行节点：执行当前步骤，返回结果"""
    step = state["plan"][state["step_idx"]]
    # 这里可以是工具调用 / 子 Agent / 子 LLM
    result = executor_agent.invoke(step.description)
    return {"results": [result], "step_idx": state["step_idx"] + 1}

def should_continue(state):
    return "execute" if state["step_idx"] < len(state["plan"]) else END

# ② 构建图
graph = StateGraph(dict)
graph.add_node("plan", plan_node)
graph.add_node("execute", execute_node)
graph.set_entry_point("plan")
graph.add_edge("plan", "execute")
graph.add_conditional_edges("execute", should_continue)

app = graph.compile()`;

  const langchainBlock = codeBlock('LangGraph 实现 Plan-and-Execute', 'dot-orange', 'python', langchainCode);

  const langchainBox = ruleBox('success',
    `<strong>三个关键设计</strong><br><br>
    • <strong>Planner 用 structured output</strong>：Pydantic 强制 LLM 输出结构化 Plan，避免解析文本格式飘了<br>
    • <strong>Executor 解耦</strong>：执行节点里可以是工具、子 Agent、子 LLM —— 灵活替换不影响 Planner<br>
    • <strong>条件边控制循环</strong>：<code>step_idx < len(plan)</code> 判断是否还有步骤，避免死循环<br><br>
    <strong>注意</strong>：老版 LangChain 的 <code>langchain_experimental.plan_and_execute</code> 已不推荐，新项目用 LangGraph 自建图。`);

  // ── Section 5: ReAct vs Plan-Execute 五维对比 ───────────────────────────────

  const compareRows = [
    ['规划方式',   '走一步看一步（reactive）',     '先规划全局（proactive）'],
    ['LLM 调用',   'N 步 = N 次思考',              '1 次规划 + N 次执行'],
    ['Token 成本', '高（每步重读历史）',          '低（执行器只看当前步骤）'],
    ['适应性',     '强（可随时调整）',              '弱（计划固化，需 Re-planner）'],
    ['适用场景',   '探索性 / 开放任务',             '流程明确 / 多步任务'],
  ];
  const compareTable = compareCard(compareRows, ['ReAct', 'Plan-and-Execute']);

  const decisionBox = ruleBox('warning',
    `<strong>选型决策</strong><br><br>
    • <strong>ReAct</strong>：任务未知、需要边探索边决策（如"研究一下 React 19 有什么新特性"）<br>
    • <strong>Plan-and-Execute</strong>：流程明确、步骤可预知（如"策划团建"、"订机票 + 订酒店 + 排日程"）<br>
    • <strong>混合策略</strong>：Plan-and-Execute 做主循环，每个 Executor 内部用 ReAct 应对不确定性<br><br>
    反例：用 Plan-and-Execute 做"研究 X"，规划器无法预知步骤，硬编出 [搜索, 阅读, 总结] 三步，执行时发现需要多次搜索 + 多次阅读，计划崩溃；用 ReAct 做"策划团建"，每步都重新思考"下一步是订机票还是订酒店"，token 浪费 3 倍。`);

  // ── Section 6: 工程实践（Re-planner + 混合策略）────────────────────────────

  const replanCode = `# 加 Re-planner：执行完每步后判断是否需要调整计划
def replan_node(state):
    """根据当前执行结果，判断是否需要调整后续计划"""
    latest_result = state["results"][-1]
    remaining_steps = state["plan"][state["step_idx"]:]
    new_plan = replanner_llm.invoke(
        f"已执行结果：{latest_result}\\n"
        f"剩余计划：{remaining_steps}\\n"
        f"是否需要调整？如需调整输出新计划，否则原样返回。"
    )
    return {"plan": new_plan.steps}

# 混合：Plan 做主循环，Executor 内部用 ReAct
def execute_with_react(state):
    """每个步骤用 ReAct Agent 执行，应对步骤内的不确定性"""
    step = state["plan"][state["step_idx"]]
    react_agent = create_react_agent(llm, tools)
    return react_agent.invoke({"input": step.description})`;

  const replanBlock = codeBlock('Re-planner + 混合策略', 'dot-blue', 'python', replanCode);

  const practiceBox = ruleBox('info',
    `<strong>三个工程要点</strong><br><br>
    ① <strong>加 Re-planner</strong>：执行完关键步骤后判断是否需要调整后续计划 —— 预算超了砍景点、机票没了换高铁<br>
    ② <strong>Executor 内部用 ReAct</strong>：每步用 ReAct Agent 执行，兼顾 Plan 的全局视角和 ReAct 的即时反馈<br>
    ③ <strong>设 max_steps 兜底</strong>：Planner 偶尔会生成无限循环的计划，强制上限（如 20 步）<br><br>
    <strong>经验</strong>：生产级 Agent 几乎都是<strong>Plan-and-Execute 主循环 + 每步 ReAct</strong>，单一模式都有明显短板。`);

  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    Route Plan 解决<strong>"全局视角"</strong>，ReAct 解决<strong>"即时反馈"</strong>，混合策略最佳。<br><br>
    <strong>工程默认决策</strong>：<br>
    • 流程明确的复杂任务 → Plan-and-Execute<br>
    • 探索性开放任务 → ReAct<br>
    • 生产级长任务 → Plan-and-Execute 主循环 + 每步 ReAct + 关键节点 Re-plan<br><br>
    别为追求"简单"全用 ReAct：长任务里 ReAct 每步重读历史的 token 成本，比 Planner 一次规划的 token 成本高得多；也别为追求"先进"全用 Plan-and-Execute：不确定任务里 Planner 会编出错的步骤列表。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}
    ${section('Plan-and-Execute 三段式架构', archBox)}
    ${section('LangGraph 实现', langchainBlock + langchainBox)}
    ${section('ReAct vs Plan-Execute 五维对比', compareTable + decisionBox)}
    ${section('工程实践', replanBlock + practiceBox)}
    ${section('选型总结', summaryBox)}`);
}
