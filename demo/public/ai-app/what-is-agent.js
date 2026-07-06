function renderWhatIsAgent(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>Agent 核心结论：把 LLM 从"问答机器"升级为"会做事的助手"</strong><br><br>
    传统 LLM 对话 = <strong>一问一答</strong>，给一句话回一句话，没有后续。<br>
    Agent = <strong>给一个目标，自己拆解步骤、调用工具、观察结果、循环迭代，直到完成</strong>。<br><br>
    <strong>贾维斯类比</strong>：钢铁侠问贾维斯"帮我分析这个敌人弱点"，贾维斯不是回一段文字就完事，而是<strong>主动去查数据库、运行模拟、调取战甲参数、给出可执行建议</strong> —— 这就是 Agent。<br><br>
    工程上一句话：<code>LLM 是大脑，Agent 是大脑 + 手 + 眼睛 + 记忆 + 工具</code>。`);

  // ── 什么是 Agent ─────────────────────────────────────────────────────────────

  const whatIsBox = ruleBox('info',
    `<strong>Agent（智能体）是什么？</strong><br><br>
    Anthropic 的定义：<strong>Agent 是一种系统，LLM 动态地指导自己的执行流程，决定下一步做什么、调用什么工具、何时停止</strong>，而不是按固定流程执行。<br><br>
    关键特征：<br>
    • <strong>自主性</strong>：给定目标后，Agent 自己规划步骤，不需要人逐步指挥<br>
    • <strong>工具使用</strong>：能调用搜索、代码执行、API、数据库等外部工具<br>
    • <strong>循环迭代</strong>：执行 → 观察结果 → 调整计划 → 再执行，直到完成<br>
    • <strong>记忆</strong>：能记住中间状态、历史对话、已执行的操作<br><br>
    反例：固定流程的"调用 LLM → 解析 JSON → 调 API"链条，<strong>不是 Agent</strong>，只是 LLM 编排（Workflow）。`);

  // ── 贾维斯类比 ───────────────────────────────────────────────────────────────

  const jarvisBox = ruleBox('success',
    `<strong>用贾维斯（J.A.R.V.I.S.）理解 Agent</strong><br><br>
    漫威电影里托尼·斯塔克和贾维斯的交互模式：<br><br>
    <strong>场景一</strong>：托尼说"贾维斯，帮我看看这身战甲还有什么问题"<br>
    • 贾维斯<strong>主动扫描</strong>战甲所有部件（调用工具）<br>
    • <strong>列出</strong>问题清单（中间结果）<br>
    • <strong>查询</strong>库存零件，给出修复方案（多步推理）<br>
    • 托尼确认后<strong>执行</strong>修复（行动）<br><br>
    <strong>场景二</strong>：托尼说"分析一下这个敌人的弱点"<br>
    • 贾维斯<strong>调取</strong>敌人数据库（工具调用）<br>
    • <strong>运行</strong>战斗模拟（代码执行）<br>
    • 发现数据不足，<strong>主动请求</strong>托尼提供更多情报（自我判断信息缺口）<br>
    • 综合所有信息给出建议<br><br>
    <strong>这正是 Agent 的工作模式</strong>：目标导向、多步执行、工具调用、循环迭代、主动反馈。<br>
    传统 LLM 对话更像<strong>钢铁侠问"战甲用什么材料？"，LLM 回答"钛合金"</strong> —— 一问一答，结束。`);

  // ── 传统 LLM 对话 vs Agent 对比 ──────────────────────────────────────────────

  const compareRows = [
    ['交互模式',     '一问一答，单轮',           '目标导向，多轮循环'],
    ['控制权',       '用户主导，LLM 被动响应',    'Agent 自主决策，用户给目标'],
    ['工具使用',     '无，纯文本生成',            '主动调用搜索/API/代码执行等'],
    ['记忆',         '仅对话上下文（受窗口限制）', '短期记忆 + 长期记忆（向量库/KV库）'],
    ['执行流程',     '固定：输入 → 生成 → 输出',  '动态：感知 → 规划 → 行动 → 观察 → 循环'],
    ['错误处理',     '生成错了就错了，需用户纠正', '能观察错误、反思、重试'],
    ['完成判定',     '生成结束即完成',            'Agent 自己判断目标是否达成'],
    ['典型代表',     'ChatGPT 默认对话',          'Claude Code、Cursor Agent、Devin'],
    ['类比',         '百科全书',                  '私人助理贾维斯'],
  ];

  const compareTable = compareCard(compareRows, ['传统 LLM 对话', 'Agent']);

  // ── 三方对比：LLM vs Workflow vs Agent ───────────────────────────────────────

  const threeRows = [
    ['LLM 对话',     '用户问 → LLM 答',                '问答、写作、翻译',         '无',           '无'],
    ['LLM Workflow', '固定流程编排 LLM 调用',          'RAG、固定步骤任务',         '固定流程内',   '无'],
    ['Agent',        'LLM 自主决定流程和工具',         '开放性、多步骤任务',         '动态决策',     '有'],
  ];

  const threeTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.2fr 1.8fr 1.6fr 1.2fr 0.8fr">
        <div class="compare-card-header-cell ai">类型</div>
        <div class="compare-card-header-cell frontend">工作方式</div>
        <div class="compare-card-header-cell desc">适用场景</div>
        <div class="compare-card-header-cell desc">工具调用</div>
        <div class="compare-card-header-cell desc">循环</div>
      </div>
      ${threeRows.map(([t, w, s, tl, l]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.2fr 1.8fr 1.6fr 1.2fr 0.8fr">
        <div class="compare-card-cell ai">${escHtml(t)}</div>
        <div class="compare-card-cell frontend">${escHtml(w)}</div>
        <div class="compare-card-cell desc">${escHtml(s)}</div>
        <div class="compare-card-cell desc">${escHtml(tl)}</div>
        <div class="compare-card-cell desc">${escHtml(l)}</div>
      </div>`).join('')}
    </div>`;

  const threeBox = ruleBox('warning',
    `<strong>重要区分：Workflow ≠ Agent</strong><br><br>
    很多人把"用 LangChain 串了三个 LLM 调用"叫 Agent，<strong>这是误解</strong>。<br>
    • <strong>Workflow</strong>：流程是<strong>开发者写死的</strong>，LLM 只在每个节点做局部决策<br>
    • <strong>Agent</strong>：流程是 <strong>LLM 自己决定的</strong>，下一步做什么、调用什么工具、何时停止<br><br>
    Anthropic 的判别标准：<code>如果 LLM 不能动态决定执行路径，就不是 Agent</code>。<br>
    这个区分很重要，因为 Agent 的复杂度、成本、不可预测性都比 Workflow 高一个量级。`);

  // ────────────────────────────────────────────────────────────────────────────
  // Agent 的核心组件
  // ────────────────────────────────────────────────────────────────────────────

  const componentRows = [
    ['大脑（LLM）',          '推理、规划、决策',           'GPT-4o / Claude 3.5 / Gemini',          '核心引擎，决定 Agent 上限'],
    ['记忆（Memory）',       '短期上下文 + 长期知识',      '对话历史 / 向量库 / KV 存储',            '让 Agent 能跨轮次保持状态'],
    ['工具（Tools）',        '与外部世界交互',             '搜索 / 代码执行 / API / 数据库',         '决定 Agent 能"做"什么'],
    ['规划（Planning）',     '拆解目标为子任务',           'CoT / ReAct / Plan-and-Execute',        '复杂任务的关键'],
    ['感知（Perception）',   '理解用户意图和环境',         'Prompt 解析 / 多模态输入',               '决定 Agent 能理解什么'],
    ['行动（Action）',       '执行具体操作',               '工具调用 / 代码执行 / 文件操作',         '产生实际效果'],
    ['反思（Reflection）',   '观察结果、调整策略',         'Reflexion / Self-Critique',              '失败重试的关键'],
  ];

  const componentTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.6fr 1.8fr 1.6fr">
        <div class="compare-card-header-cell ai">组件</div>
        <div class="compare-card-header-cell frontend">作用</div>
        <div class="compare-card-header-cell frontend">典型实现</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${componentRows.map(([c, r, i, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.6fr 1.8fr 1.6fr">
        <div class="compare-card-cell ai">${escHtml(c)}</div>
        <div class="compare-card-cell frontend">${escHtml(r)}</div>
        <div class="compare-card-cell frontend">${escHtml(i)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const jarvisComponentBox = ruleBox('success',
    `<strong>对应到贾维斯</strong><br><br>
    • <strong>大脑</strong>：贾维斯的核心 AI（对应 LLM）<br>
    • <strong>记忆</strong>：能记住托尼的所有战甲型号、过往战斗数据<br>
    • <strong>工具</strong>：控制钢铁军团、调取数据库、运行模拟、操控机械臂<br>
    • <strong>规划</strong>：把"修复战甲"拆成"扫描→诊断→备件查询→修复"多步<br>
    • <strong>感知</strong>：理解托尼的语音指令、识别战甲状态<br>
    • <strong>行动</strong>：实际操控机械臂修复、启动模拟<br>
    • <strong>反思</strong>：发现某个方案不可行时主动提出替代方案<br><br>
    <strong>缺任何一项，贾维斯就不再是贾维斯</strong> —— 缺工具就是个语音百科，缺记忆就每次都从头开始，缺反思就只会机械执行。`);

  // ────────────────────────────────────────────────────────────────────────────
  // Agent 的工作循环
  // ────────────────────────────────────────────────────────────────────────────

  const loopBox = ruleBox('info',
    `<strong>Agent 的核心工作循环：ReAct 模式</strong><br><br>
    ReAct = Reasoning + Acting，<strong>思考-行动-观察</strong>的循环：<br><br>
    <code>Thought → Action → Observation → Thought → Action → ... → Final Answer</code><br><br>
    <strong>每一轮</strong>：<br>
    1. <strong>Thought</strong>：根据当前目标 + 已知信息，思考下一步该做什么<br>
    2. <strong>Action</strong>：调用工具或执行操作<br>
    3. <strong>Observation</strong>：观察工具返回的结果<br>
    4. 回到 Thought，根据新观察调整计划<br><br>
    <strong>终止条件</strong>：Agent 自己判断目标已达成，或达到最大迭代次数。`);

  const reactCode = `# ReAct Agent 的典型 Prompt 结构
prompt = """
你是一个能调用工具的 Agent。请按 ReAct 模式工作：

可用工具：
- search(query): 搜索网络
- python(code): 执行 Python 代码
- lookup(key): 查询数据库

任务：{user_goal}

请按以下格式输出，直到完成任务：
Thought: 思考下一步
Action: 工具调用（JSON 格式）
Observation: 工具返回结果（系统填充）
... (循环)
Thought: 任务完成
Final Answer: 最终答案
"""

# Agent 循环（伪代码）
for step in range(max_steps):
    response = llm(prompt + history)
    if "Final Answer" in response:
        return final_answer
    action = parse_action(response)
    observation = execute_tool(action)
    history.append((response, observation))`;

  const reactBlock = codeBlock('ReAct Agent 工作循环（伪代码）', 'dot-orange', 'python', reactCode);

  // ────────────────────────────────────────────────────────────────────────────
  // 传统 LLM 对话的局限
  // ────────────────────────────────────────────────────────────────────────────

  const limit1 = ruleBox('danger',
    `<strong>局限一：无法获取实时信息</strong><br><br>
    LLM 训练数据有截止日期，问"今天天气如何"或"最新版 React 是什么"，传统对话只能瞎猜或承认不知道。<br>
    Agent 通过<strong>调用搜索工具</strong>获取实时信息，再结合自身能力生成答案。<br><br>
    贾维斯类比：托尼问"这个敌人的最新动态"，贾维斯会<strong>主动连入数据库</strong>调取最新情报，而不是凭记忆瞎说。`);

  const limit2 = ruleBox('danger',
    `<strong>局限二：无法执行操作</strong><br><br>
    传统 LLM 只能"说"不能"做"。问"帮我订明天去上海的机票"，LLM 只能列出"你可以打开携程..."的步骤，<strong>不会真的去订</strong>。<br>
    Agent 通过<strong>调用 API 工具</strong>能真正完成订票、发邮件、改文件等操作。<br><br>
    贾维斯类比：托尼说"启动战甲自毁程序"，贾维斯<strong>真的会启动</strong>，而不是回一段"启动步骤如下..."。`);

  const limit3 = ruleBox('danger',
    `<strong>局限三：复杂任务无法分解</strong><br><br>
    传统 LLM 一次生成全部答案，对"先调研市场、再分析竞品、最后写报告"这种多步骤任务无能为力 —— 一次性输出容易跑题、信息缺失。<br>
    Agent 能<strong>自己拆解任务、分步执行、中间检查</strong>，每步结果作为下一步输入。<br><br>
    贾维斯类比：托尼说"设计新战甲"，贾维斯不会一次性画完所有图纸，而是<strong>分模块设计、逐个验证、迭代优化</strong>。`);

  const limit4 = ruleBox('warning',
    `<strong>局限四：无法处理错误和重试</strong><br><br>
    传统 LLM 生成错了就错了，用户得手动纠正重问。<br>
    Agent 能<strong>观察执行结果</strong>，发现代码报错就<strong>自己 debug</strong>，发现搜索结果不对就<strong>换关键词重搜</strong>。<br><br>
    贾维斯类比：模拟失败时贾维斯会<strong>主动分析原因</strong>，调整参数重新模拟，而不是直接报"模拟失败"就完事。`);

  const limit5 = ruleBox('warning',
    `<strong>局限五：无长期记忆</strong><br><br>
    传统 LLM 受上下文窗口限制，长对话会"忘记"早期内容。<br>
    Agent 通过<strong>外部记忆系统</strong>（向量库、KV 数据库）实现长期记忆，能跨会话记住用户偏好、历史任务。<br><br>
    贾维斯类比：贾维斯记得托尼<strong>所有过往战甲的设计细节、所有敌人的战斗数据</strong>，不是每次重新认识。`);

  // ────────────────────────────────────────────────────────────────────────────
  // Agent 的典型框架
  // ────────────────────────────────────────────────────────────────────────────

  const frameworkRows = [
    ['ReAct',              'Thought-Action-Observation 循环', '简单、通用、易实现',           '短任务、原型验证',           '最早经典框架'],
    ['Plan-and-Execute',   '先全局规划再分步执行',             '减少中间 LLM 调用、节省成本', '任务步骤明确、可规划',       '规划错了全盘皆输'],
    ['Reflexion',          '执行后反思、积累经验重试',         '能从失败中学习',              '需要重试的复杂任务',         '实现复杂、Token 消耗大'],
    ['Tree of Thoughts',   '树状探索多条思路',                 '能回溯、适合搜索类问题',       '数学题、推理题',             '成本高、慢'],
    ['Multi-Agent',        '多个 Agent 协作（如 CrewAI）',     '角色分工、模拟人类社会',       '复杂协作任务',               '协调成本高、易混乱'],
    ['Autonomous Agent',   '长期自主运行（如 AutoGPT）',       '能长期执行、自我驱动',         '开放式探索任务',             '不可控、成本高'],
  ];

  const frameworkTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.8fr 1.6fr 1.4fr 1.4fr">
        <div class="compare-card-header-cell ai">框架</div>
        <div class="compare-card-header-cell frontend">核心思路</div>
        <div class="compare-card-header-cell frontend">优点</div>
        <div class="compare-card-header-cell desc">适用场景</div>
        <div class="compare-card-header-cell desc">缺点</div>
      </div>
      ${frameworkRows.map(([f, c, p, s, con]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.8fr 1.6fr 1.4fr 1.4fr">
        <div class="compare-card-cell ai">${escHtml(f)}</div>
        <div class="compare-card-cell frontend">${escHtml(c)}</div>
        <div class="compare-card-cell frontend">${escHtml(p)}</div>
        <div class="compare-card-cell desc">${escHtml(s)}</div>
        <div class="compare-card-cell desc">${escHtml(con)}</div>
      </div>`).join('')}
    </div>`;

  // ────────────────────────────────────────────────────────────────────────────
  // 代码示例：Agent 实战
  // ────────────────────────────────────────────────────────────────────────────

  const claudeCode = `# 用 Claude API 实现一个最小 Agent（带工具调用）
import anthropic
import json

client = anthropic.Anthropic()

# 定义工具
tools = [
    {
        "name": "search",
        "description": "搜索网络获取最新信息",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "python_exec",
        "description": "执行 Python 代码",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "要执行的 Python 代码"}
            },
            "required": ["code"]
        }
    }
]

def run_agent(user_goal: str, max_steps: int = 10):
    messages = [{"role": "user", "content": user_goal}]

    for step in range(max_steps):
        # LLM 决策：思考下一步 + 是否调用工具
        resp = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            tools=tools,
            messages=messages,
        )

        # 如果 LLM 决定停止（给出最终答案）
        if resp.stop_reason == "end_turn":
            return resp.content[-1].text

        # 如果 LLM 决定调用工具
        if resp.stop_reason == "tool_use":
            tool_results = []
            for block in resp.content:
                if block.type == "tool_use":
                    # 实际执行工具
                    if block.name == "search":
                        result = do_search(block.input["query"])
                    elif block.name == "python_exec":
                        result = exec_python(block.input["code"])
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result
                    })
            # 把工具结果反馈给 LLM，进入下一轮
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": tool_results})

    return "达到最大步数，任务未完成"

# 调用：让 Agent 自己决定怎么完成
print(run_agent("查一下今天 A 股大盘情况，并算出涨跌幅"))`;

  const claudeBlock = codeBlock('Claude Agent 最小实现（工具调用循环）', 'dot-orange', 'python', claudeCode);

  // ────────────────────────────────────────────────────────────────────────────
  // 常见误区
  // ────────────────────────────────────────────────────────────────────────────

  const pitfall1 = ruleBox('danger',
    `<strong>误区一："用 LangChain 串了几个 LLM 调用就是 Agent"</strong><br><br>
    <strong>错</strong>。如果流程是<strong>写死的</strong>（先调 LLM A，再调 LLM B，再调 LLM C），这是 Workflow 不是 Agent。<br>
    判别标准：<strong>LLM 能不能动态决定下一步做什么</strong>。能 = Agent，不能 = Workflow。<br>
    这个区分很重要：Workflow 可控、可测试、成本低；Agent 灵活但不可控、成本高。用错场景代价很大。`);

  const pitfall2 = ruleBox('danger',
    `<strong>误区二："Agent 比 LLM 对话更强大，所以应该都用 Agent"</strong><br><br>
    <strong>错</strong>。Agent 的代价：<br>
    • <strong>成本</strong>：多轮 LLM 调用，单次任务 Token 消耗是单轮对话的 5~50 倍<br>
    • <strong>延迟</strong>：多步执行，单任务延迟从秒级涨到分钟级<br>
    • <strong>不可控</strong>：LLM 自主决策可能跑偏、陷入死循环、调用不该调的工具<br>
    • <strong>调试难</strong>：失败原因可能在于规划、工具、观察任一环节<br><br>
    <strong>能用 Workflow 解决的，不要用 Agent</strong>。Agent 是<strong>最后手段</strong>，不是默认选项。`);

  const pitfall3 = ruleBox('warning',
    `<strong>误区三："Agent 就是能调用工具的 LLM"</strong><br><br>
    <strong>不完整</strong>。工具调用只是 Agent 的一个组件。<br>
    完整的 Agent 还需要：<strong>记忆、规划、反思</strong>。<br>
    一个只能调用工具但没有循环和反思的 LLM，本质还是<strong>单轮工具调用</strong>，不是真正的 Agent。<br>
    贾维斯不是"会查数据库的语音助手"，而是<strong>能根据查到的信息继续行动</strong>的助手。`);

  const pitfall4 = ruleBox('warning',
    `<strong>误区四："Agent 能完全替代人"</strong><br><br>
    <strong>错</strong>。当前 Agent 的能力边界：<br>
    • 复杂推理仍会出错（特别是多步逻辑链）<br>
    • 工具调用可能产生<strong>不可逆操作</strong>（删文件、发邮件、转账）<br>
    • 长任务容易跑偏、陷入死循环<br>
    • 对模糊指令的理解远不如人<br><br>
    <strong>人机协作</strong>才是当前阶段的正确姿势：Agent 处理机械执行，人做关键决策。贾维斯也是听托尼指挥，不是自己决定去打谁。`);

  // ────────────────────────────────────────────────────────────────────────────
  // 选型清单
  // ────────────────────────────────────────────────────────────────────────────

  const decisionRows = [
    ['任务复杂度',     '简单问答、单步生成',        '多步骤、需要拆解'],
    ['是否需要工具',   '不需要',                    '需要搜索/API/代码执行'],
    ['是否需要记忆',   '单轮对话即可',              '需要跨轮次/跨会话记忆'],
    ['成本敏感度',     '高',                        '低'],
    ['延迟要求',       '严格（&lt; 3 秒）',         '宽松（&gt; 30 秒可接受）'],
    ['可控性要求',     '高（生产环境）',            '低（实验/辅助场景）'],
    ['典型选择',       'LLM 对话 / Workflow',       'Agent'],
  ];

  const decisionTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell desc">维度</div>
        <div class="compare-card-header-cell frontend">LLM 对话 / Workflow</div>
        <div class="compare-card-header-cell ai">Agent</div>
      </div>
      ${decisionRows.map(([d, l, a]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell desc">${escHtml(d)}</div>
        <div class="compare-card-cell frontend">${escHtml(l)}</div>
        <div class="compare-card-cell ai">${escHtml(a)}</div>
      </div>`).join('')}
    </div>`;

  const summaryBox = ruleBox('success',
    `<strong>什么时候用 LLM 对话 / Workflow</strong><br>
    • 单轮问答、写作、翻译<br>
    • 流程固定的任务（RAG、分类、抽取）<br>
    • 对延迟和成本敏感的生产环境<br>
    • 任务步骤可预先规划、不需要动态决策<br><br>
    <strong>什么时候用 Agent</strong><br>
    • 开放性任务，步骤无法预先规划<br>
    • 需要调用多种工具，且调用顺序动态<br>
    • 需要根据中间结果调整策略<br>
    • 可以接受较高延迟和成本<br><br>
    <strong>混合策略</strong>：核心流程用 Workflow 保证可控，关键决策点用 Agent 处理开放性。这是当前生产系统的主流模式。<br><br>
    <strong>贾维斯式终局</strong>：随着模型能力提升（推理、长上下文）和工具生态成熟，Agent 的能力边界会持续扩展，但"完全自主"的 Agent 仍是长期目标，不是短期现实。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('什么是 Agent', whatIsBox)}
    ${section('贾维斯类比：理解 Agent 的工作模式', jarvisBox)}
    ${section('传统 LLM 对话 vs Agent', compareTable)}
    ${section('LLM / Workflow / Agent 三方对比', threeTable + threeBox)}
    ${section('Agent 的核心组件', componentTable + jarvisComponentBox)}
    ${section('Agent 的工作循环：ReAct 模式', loopBox + reactBlock)}
    ${section('传统 LLM 对话的局限', limit1 + limit2 + limit3 + limit4 + limit5)}
    ${section('Agent 的典型框架', frameworkTable)}
    ${section('代码示例：最小 Agent 实现', claudeBlock)}
    ${section('常见误区', pitfall1 + pitfall2 + pitfall3 + pitfall4)}
    ${section('选型决策：什么时候用 Agent', decisionTable + summaryBox)}`);
}
