function renderHitl(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：HITL（Human-in-the-Loop）= 关键节点暂停，让人审核后再继续</strong><br><br>
    HITL 是 Agent 的<strong>"安全带"</strong> —— 把人插入到自动化流程的关键节点，让 AI 自主跑、人类把关键关。<br><br>
    解决两个矛盾：<strong>AI 能力不足</strong>（高风险决策做不好）+ <strong>AI 自主性需求</strong>（用户想要自动化，不想要"全自动出错"）。<br><br>
    工程上一句话：<code>Agent 执行 → 到达 checkpoint → 暂停 → 等待人审核 → 人批准/修改/拒绝 → Agent 继续</code>。<br><br>
    没有 HITL，要么 AI 全自动（出错了用户兜不住），要么每步都问人（退化成手动操作）。`);

  // ── Section 2: 场景切入 + 贯穿示例 ───────────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：一个写邮件 Agent 的三种风险</strong><br><br>
    用户输入：「帮我给客户发邮件催款，语气强硬一点」<br><br>
    <strong>风险 1</strong>：AI 草稿写好后直接发出去 —— 语气过激 / 收件人错了 / 金额写错，邮件已发出无法收回<br>
    <strong>风险 2</strong>：AI 把草稿给用户看，用户每次都要手动改 —— 退化成"AI 写、人抄"，没省事<br>
    <strong>风险 3</strong>：AI 发送前弹窗让用户确认，用户点"通过" —— <strong>这就是 HITL</strong>，既自动又安全<br><br>
    <strong>HITL 的本质</strong>：AI 干 90% 的活，关键 10% 由人把关。`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>三类必须上 HITL 的场景</strong><br><br>
    ① <strong>不可逆操作</strong>：发邮件、转账、删数据、提交订单 —— 出错无法撤回<br>
    ② <strong>高风险决策</strong>：写代码合并到主干、给客户报价、医疗建议 —— 出错代价大<br>
    ③ <strong>模糊判断</strong>：用户偏好、业务规则、主观审美 —— AI 没有标准答案<br><br>
    反例：查天气、翻译、摘要这种<strong>低风险可逆</strong>操作，加 HITL 是过度设计，每步问人反而拖慢流程。`);

  // ── Section 3: 三种 HITL 模式 ─────────────────────────────────────────────────

  const modesTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">模式</div>
        <div class="compare-card-header-cell ai">触发点</div>
        <div class="compare-card-header-cell desc">典型应用</div>
      </div>
      ${[
        ['Approve',  '执行前等批准',     '发邮件前、转账前、合并代码前'],
        ['Edit',     '执行前等修改',     'AI 生成草稿，用户改完再发'],
        ['Review',   '执行后等审核',     'AI 执行完，用户审核结果决定是否重做'],
      ].map(([m, t, a]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">${escHtml(m)}</div>
        <div class="compare-card-cell ai">${escHtml(t)}</div>
        <div class="compare-card-cell desc">${escHtml(a)}</div>
      </div>`).join('')}
    </div>`;

  const modesBox = ruleBox('info',
    `<strong>三种 HITL 模式对比</strong><br><br>
    • <strong>Approve（批准）</strong>：AI 给方案，人<strong>同意/拒绝</strong>。适合简单风险低的决策（如"是否发送这封邮件"）<br>
    • <strong>Edit（编辑）</strong>：AI 给草稿，人<strong>修改</strong>后继续。适合需要主观判断的内容（如邮件正文、报价单）<br>
    • <strong>Review（审核）</strong>：AI 先执行完，人<strong>事后审核</strong>。适合无法提前预知结果的操作（如 SQL 执行后看影响）<br><br>
    工程上常组合用：邮件正文用 Edit（写完改）、收件人用 Approve（确认无误才发）、发送后用 Review（看是否需要追回）。`);

  // ── Section 4: LangGraph 实现（interrupt）────────────────────────────────────

  const langgraphCode = `# LangGraph 实现 HITL（interrupt 暂停机制）
# 来源：LangGraph 官方 human-in-the-loop 文档
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o", temperature=0)

# ① draft 节点：AI 生成邮件草稿
def draft_node(state):
    email = llm.invoke(
        f"写一封催款邮件，语气强硬：\\n{state['input']}"
    )
    return {"draft": email.content}

# ② review 节点：暂停等人审核
def review_node(state):
    # 这里不做事，只是标记 checkpoint
    # LangGraph 会在此暂停，等待用户输入
    return {}

# ③ send 节点：审核通过后真正发送
def send_node(state):
    # state["approved"] 是用户在暂停期间注入的
    if not state.get("approved"):
        return {"error": "未通过审核"}
    return {"sent": True, "final_email": state.get("edited_draft", state["draft"])}

# ④ 构建图 + 编译时加 checkpointer + interrupt
graph = StateGraph(dict)
graph.add_node("draft", draft_node)
graph.add_node("review", review_node)
graph.add_node("send", send_node)
graph.set_entry_point("draft")
graph.add_edge("draft", "review")
graph.add_edge("review", "send")
graph.add_edge("send", END)

# 关键：编译时传入 checkpointer + 在 review 节点处 interrupt
app = graph.compile(
    checkpointer=MemorySaver(),  # 保存中间状态
    interrupt_before=["review"]  # 在 review 节点前暂停
)

# ⑤ 运行：第一次调用会暂停在 review 前
config = {"configurable": {"thread_id": "thread-1"}}
result = app.invoke({"input": "客户 A 欠款 5 万元"}, config)

# ⑥ 用户审核 + 注入修改
# 用户看了草稿，改了语气，注入 approved=True
app.update_state(config, {
    "approved": True,
    "edited_draft": "客户您好，提醒您 5 万元欠款..."  # 用户改后的正文
})

# ⑦ 继续执行：从暂停处恢复
final = app.invoke(None, config)  # None 表示继续之前的执行`;

  const langgraphBlock = codeBlock('LangGraph HITL 实现', 'dot-orange', 'python', langgraphCode);

  const langgraphBox = ruleBox('success',
    `<strong>三个关键设计</strong><br><br>
    • <strong>interrupt_before</strong>：在指定节点<strong>前</strong>暂停，状态由 checkpointer 保存到内存或数据库<br>
    • <strong>thread_id</strong>：每个会话用独立线程 ID，暂停后可通过 ID 恢复，支持多个用户并发<br>
    • <strong>update_state</strong>：暂停期间可向状态注入数据（用户审核结果、修改后的草稿、批准/拒绝标志）<br><br>
    <strong>核心</strong>：暂停不是阻塞线程，而是<strong>把状态持久化 + 返回控制权给调用方</strong>。前端可以拿草稿展示给用户，用户操作完再调 <code>invoke(None)</code> 继续。`);

  // ── Section 5: HITL vs 无 HITL 对比 ──────────────────────────────────────────

  const compareRows = [
    ['风险控制',   '出错后才发现',                '出错前拦截'],
    ['用户参与',   '全自动 / 全手动',             '关键节点把关'],
    ['响应速度',   '快（无暂停）',                '关键节点暂停'],
    ['适用场景',   '低风险可逆任务',              '高风险不可逆任务'],
    ['工程复杂度', '低',                          '高（需 checkpointer + 状态恢复）'],
  ];
  const compareTable = compareCard(compareRows, ['无 HITL', '有 HITL']);

  const decisionBox = ruleBox('warning',
    `<strong>选型决策</strong><br><br>
    • <strong>低风险可逆</strong>（查天气、翻译、摘要）→ 不用 HITL，每步问人反而拖慢<br>
    • <strong>高风险不可逆</strong>（发邮件、转转账、删数据）→ 必须 HITL，否则出错无法挽回<br>
    • <strong>模糊判断</strong>（写文案、做设计、给报价）→ 用 Edit 模式，AI 出草稿人改<br><br>
    反例：用 HITL 做"翻译一篇文章"，每段都要人确认，10 段文要交互 10 次，用户会疯；用全自动做"批量转账"，AI 把收款人搞错，几百万打水漂。`);

  // ── Section 6: 工程实践（状态持久化 + 超时处理）────────────────────────────

  const persistCode = `# 生产级 HITL：状态持久化 + 超时处理
from langgraph.checkpoint.postgres import PostgresSaver
from datetime import datetime, timedelta

# ① 用 Postgres 而非 Memory，支持服务重启后恢复
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://user:pass@localhost/mydb"
)

app = graph.compile(
    checkpointer=checkpointer,
    interrupt_before=["review"]
)

# ② 超时处理：用户审核超时自动取消
def check_timeout(thread_id, timeout_hours=24):
    state = app.get_state({"configurable": {"thread_id": thread_id}})
    paused_at = state.values.get("paused_at")
    if paused_at and datetime.now() - paused_at > timedelta(hours=timeout_hours):
        app.update_state(
            {"configurable": {"thread_id": thread_id}},
            {"approved": False, "timeout": True}
        )
        app.invoke(None, {"configurable": {"thread_id": thread_id}})`;

  const persistBlock = codeBlock('生产级 HITL 持久化', 'dot-blue', 'python', persistCode);

  const practiceBox = ruleBox('info',
    `<strong>三个工程要点</strong><br><br>
    ① <strong>状态持久化</strong>：用 Postgres / Redis 而非内存，服务重启后能从暂停处恢复<br>
    ② <strong>超时处理</strong>：用户可能审核完就忘了，设 24h 超时自动取消或自动通过<br>
    ③ <strong>多渠道审核</strong>：暂停后不仅靠前端，还支持邮件 / 钉钉 / Slack 推送审核通知<br><br>
    <strong>经验</strong>：HITL 的工程复杂度主要在<strong>状态管理</strong> —— 暂停、恢复、超时、并发、多用户，LangGraph 的 checkpointer 已经把这些都封装好了，不要自己造轮子。`);

  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    HITL 是 Agent 的<strong>"安全带"</strong>，在<strong>不可逆操作</strong>、<strong>高风险决策</strong>、<strong>模糊判断</strong>三类场景必须上。<br><br>
    <strong>工程默认决策</strong>：<br>
    • 低风险可逆 → 全自动，别加 HITL<br>
    • 高风险不可逆 → Approve 模式，执行前等批准<br>
    • 主观判断内容 → Edit 模式，AI 出草稿人改<br>
    • 无法预知结果 → Review 模式，执行后审核<br><br>
    别为追求"自动化"省掉 HITL：发出去的邮件、转走的钱、删掉的数据，都收不回来；也别为追求"安全"全加 HITL：每步问人会把 AI 应用退化成手动操作，违背初衷。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}
    ${section('三种 HITL 模式', modesTable + modesBox)}
    ${section('LangGraph 实现', langgraphBlock + langgraphBox)}
    ${section('HITL vs 无 HITL 对比', compareTable + decisionBox)}
    ${section('工程实践', persistBlock + practiceBox)}
    ${section('选型总结', summaryBox)}`);
}
