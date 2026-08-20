function renderIntentRecognition(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：意图识别 = 把用户的一句话映射到系统已知的 N 个意图之一</strong><br><br>
    意图识别是 AI 应用的<strong>"前台接线员"</strong> —— 听清客户说什么，转给对应部门（订票 / 查询 / 闲聊）。<br><br>
    工程上一句话：<code>用户输入 → 意图识别器 → {intent, entities} → 路由到对应 chain</code>。<br><br>
    识别错了，后面 Agent 做得再好也是 0 分 —— 路由错了就是 0 分。`);

  // ── Section 2: 场景切入 + 三类意图示例 ───────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：一个客服系统的三类意图</strong><br><br>
    ① <strong>订机票</strong>：「帮我订明天去上海的机票」→ 触发订票 Agent<br>
    ② <strong>问天气</strong>：「上海明天天气如何」→ 触发天气 RAG / API<br>
    ③ <strong>闲聊</strong>：「你好」「你是谁」→ 直接 LLM 对话<br><br>
    三类意图对应三种处理路径，<strong>意图识别就是决定走哪条路</strong>。`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>路由错了就是 0 分</strong><br><br>
    如果意图识别错了（把"订机票"识别成"闲聊"），后面 Agent 做得再好也没用 —— 用户已经被路由到错误的链路。<br><br>
    所以意图识别是 AI 应用的<strong>第一道质量关</strong>，准确率直接决定整体体验。`);

  // ── Section 3: 关键词匹配实现 + 局限 ──────────────────────────────────────────

  const keywordCode = `# 关键词匹配的极简实现
INTENT_KEYWORDS = {
    "book_flight": ["订", "机票", "航班", "去", "飞"],
    "weather":     ["天气", "下雨", "气温", "预报"],
    "chitchat":    ["你好", "你是谁", "谢谢"],
}

def detect_intent(text):
    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return intent
    return "chitchat"  # 兜底

# 测试
print(detect_intent("帮我订明天去上海的机票"))  # book_flight
print(detect_intent("上海明天天气如何"))       # weather
print(detect_intent("你好"))                  # chitchat`;

  const keywordBlock = codeBlock('关键词匹配实现', 'dot-yellow', 'python', keywordCode);

  const keywordLimitBox = ruleBox('danger',
    `<strong>关键词匹配的三大局限</strong><br><br>
    ① <strong>同义词漏判</strong>：「我想飞上海」—— 没"订"没"机票"，识别成 chitchat<br>
    ② <strong>意图歧义</strong>：「上海的机票贵不贵」—— 既有"上海"又有"机票"，可能误判为 book_flight，但用户其实是问价格<br>
    ③ <strong>维护成本高</strong>：每加一个意图就要补一堆关键词，关键词冲突时还要排优先级，越来越乱<br><br>
    本质：关键词匹配只看字面，<strong>不理解语义</strong>。`);

  // ── Section 4: LLM structured output 实现 ─────────────────────────────────────

  const llmCode = `# LangChain + Pydantic 实现意图识别
from langchain_openai import ChatOpenAI
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import Literal

# 用 Pydantic 定义意图结构
class Intent(BaseModel):
    intent: Literal["book_flight", "weather", "chitchat"] = Field(
        description="用户意图类别"
    )
    entities: dict = Field(
        description="意图相关实体，如 {'city': '上海', 'date': '明天'}",
        default={}
    )
    confidence: float = Field(
        description="识别置信度 0-1",
        ge=0, le=1
    )

llm = ChatOpenAI(model="gpt-4o", temperature=0)
structured_llm = llm.with_structured_output(Intent)

def detect_intent_llm(text):
    result = structured_llm.invoke(
        f"判断用户输入的意图，并提取实体：\\n{text}"
    )
    return result

# 测试
r = detect_intent_llm("我想飞上海")
print(r)
# Intent(intent='book_flight', entities={'city': '上海'}, confidence=0.9)`;

  const llmBlock = codeBlock('LLM structured output 实现', 'dot-green', 'python', llmCode);

  const llmAdvBox = ruleBox('success',
    `<strong>LLM 的三个优势</strong><br><br>
    ① <strong>理解同义表达</strong>：「飞上海」「去上海」「订去上海的票」都能识别为 book_flight<br>
    ② <strong>歧义可推理</strong>：「上海的机票贵不贵」LLM 能推出意图是查询价格而非订票<br>
    ③ <strong>新增意图零成本</strong>：只需在 Pydantic Literal 里加一个枚举值 + prompt 里描述，不用维护关键词表<br><br>
    本质：LLM 理解语义，<strong>不靠字面匹配</strong>。`);

  // ── Section 5: 关键词 vs LLM 五维对比 ─────────────────────────────────────────

  const compareRows = [
    ['准确率',     '低（同义词 / 歧义全挂）',  '高（理解语义）'],
    ['延迟',       '< 1ms',                    '200-500ms'],
    ['成本',       '几乎 0',                  '每次约 ¥0.001-0.01'],
    ['新增意图',   '改代码 + 维护关键词表',    '改 Pydantic + prompt'],
    ['适用场景',   '简单 / 高频 / 延迟敏感',   '复杂 / 歧义 / 意图多'],
  ];
  const compareTable = compareCard(compareRows, ['关键词匹配', 'LLM 分类']);

  const decisionBox = ruleBox('warning',
    `<strong>选型决策</strong><br><br>
    • <strong>关键词匹配</strong>：高频简单场景（如"转人工"指令、固定菜单）<br>
    • <strong>LLM 分类</strong>：开放性输入、意图多、需要抽取实体<br>
    • <strong>混合策略</strong>：先用关键词快速过滤高频意图（命中即返回），未命中再调 LLM —— 兼顾成本和准确率<br><br>
    反例：用 LLM 识别"转人工"按钮，500ms + ¥0.01/次，不如关键词 1ms + 0 成本；用关键词识别"我想飞上海"，识别成闲聊，丢了订票用户。`);

  // ── Section 6: 工程实践（混合策略 + prompt 设计要点）──────────────────────────

  const hybridCode = `# 混合策略：关键词快速路径 + LLM 兜底
def detect_intent_hybrid(text):
    # ① 关键词快速路径（命中即返回）
    intent = detect_intent(text)
    if intent != "chitchat":
        return intent

    # ② LLM 兜底（处理同义/歧义/闲聊）
    return detect_intent_llm(text).intent`;

  const hybridBlock = codeBlock('混合策略实现', 'dot-blue', 'python', hybridCode);

  const promptBox = ruleBox('info',
    `<strong>prompt 设计三要点</strong><br><br>
    ① <strong>意图枚举要全</strong>：在 prompt 里列出所有意图 + 每个意图的描述和触发场景，避免 LLM 瞎猜<br>
    ② <strong>包含反例</strong>：「'上海机票贵不贵' 是查询价格，不是订票」—— 反例比正例更能纠偏<br>
    ③ <strong>要求 confidence</strong>：让 LLM 输出置信度，低于阈值（如 0.7）转人工或追问用户<br><br>
    <strong>经验</strong>：意图识别 prompt 的反例数量，往往比正例还多。`);

  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    意图识别是 AI 应用的<strong>"前台接线员"</strong>，识别准了路由才对。<br><br>
    <strong>工程默认决策</strong>：<br>
    • 高频简单 → 关键词<br>
    • 开放复杂 → LLM<br>
    • 预算紧 / 流量大 → 混合<br><br>
    别为追求"先进"而用 LLM：一个"转人工"按钮用关键词 1ms 解决，LLM 反而 500ms + ¥0.01，不划算。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 三类意图示例', scenarioBox + scenarioWarnBox)}
    ${section('关键词匹配实现 + 局限', keywordBlock + keywordLimitBox)}
    ${section('LLM structured output 实现', llmBlock + llmAdvBox)}
    ${section('关键词 vs LLM 五维对比', compareTable + decisionBox)}
    ${section('工程实践', hybridBlock + promptBox)}
    ${section('选型总结', summaryBox)}`);
}
