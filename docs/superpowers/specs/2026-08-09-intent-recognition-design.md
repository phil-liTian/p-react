# 意图识别 — 设计文档

## 背景

`demo/ai-app.html` 是 AI 应用开发知识库，现有 5 个 topic（RAG ×2、Agent ×3）。其中 `what-is-agent.js` 在"选型决策"部分提到"流程固定的任务（RAG、分类、抽取）"属于 Workflow，但没展开讲"分类"——也就是意图识别——这一关键环节。

意图识别是 AI 应用的"前台接线员"：用户输入一句话，系统先要识别意图（订机票 / 问天气 / 闲聊 / ...），才能路由到对应的 Agent / RAG / Workflow。识别错了，后面做得再好也是 0 分。

用户希望新增一个 topic：场景驱动叙事，代码用"关键词匹配 vs LLM structured output"对比风格，放在 🤖 Agent 分组末尾。

## 目标

新增一个 topic，让读者看完后能：

1. 说清意图识别在 AI 应用中的位置（路由入口）
2. 实现一个最简的关键词匹配意图识别器，并说清它的三大局限
3. 用 LangChain structured output 实现一个 LLM 意图识别器
4. 用五维对比表说清关键词 vs LLM 的差异和选型
5. 用混合策略（关键词 + LLM 兜底）兼顾成本和准确率

## 方案

采用方案 A：场景驱动 + 关键词 vs LLM 对比。全文围绕"用户输入一句话，系统如何识别意图"展开，先用三类意图场景切入，再分别讲关键词匹配的简单与局限、LLM 的强壮，最后以五维对比表和工程实践收束。

不选方案 B（痛点驱动）的原因：场景切入弱，新手不好代入。
不选方案 C（全面铺开）的原因：与用户选定的"关键词 vs LLM 对比"代码风格不符，BERT fine-tune 方案超出范围。

## 主题元信息

追加到 `demo/public/ai-app/data.js` 的 `topics` 数组末尾：

```js
{
  id: 'intent-recognition',
  name: '意图识别',
  group: '🤖 Agent',
  type: 'accent',
  icon: '🎯',
  tags: [
    { label: '意图识别', type: 'accent' },
    { label: '关键词匹配', type: 'warning' },
    { label: 'LLM 分类', type: 'info' },
    { label: 'Structured Output', type: 'success' },
  ],
}
```

分组放在 `🤖 Agent` 末尾，紧接 `react-vs-cot`，让读者按"什么是 Agent → Agent 工作原理 → ReAct vs CoT → 意图识别（Agent 的路由入口）"的顺序自然读下来。

## 文件骨架

新建 `demo/public/ai-app/intent-recognition.js`，导出 `renderIntentRecognition(t)`。复用 `data.js` 全局 helper：`ruleBox / codeBlock / compareCard / section / articleShell / escHtml`，无需 import。

7 个 section：

### Section 1：核心结论（ruleBox-accent）

- 一句话结论：**意图识别 = 把用户的一句话映射到系统已知的 N 个意图之一**，是路由决策的入口。
- 类比：意图识别是 AI 应用的"前台接线员" —— 听清客户说什么，转给对应部门（订票 / 查询 / 闲聊）。
- 工程上一句话：`用户输入 → 意图识别器 → {intent, entities} → 路由到对应 chain`。

### Section 2：场景切入 + 三类意图示例

ruleBox-info + ruleBox-warning：

- ruleBox-info：场景说明
  - 一个客服系统常见三类意图：
    1. **订机票**：「帮我订明天去上海的机票」→ 触发订票 Agent
    2. **问天气**：「上海明天天气如何」→ 触发天气 RAG / API
    3. **闲聊**：「你好」「你是谁」→ 直接 LLM 对话
- ruleBox-warning：如果意图识别错了，后面 Agent 做得再好也没用 —— 路由错了就是 0 分。

### Section 3：关键词匹配实现 + 局限

codeBlock-python（关键词匹配的极简实现）：

```python
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
print(detect_intent("你好"))                  # chitchat
```

ruleBox-danger：三大局限

- **同义词漏判**：「我想飞上海」—— 没"订"没"机票"，识别成 chitchat
- **意图歧义**：「上海的机票贵不贵」—— 既有"上海"又有"机票"，可能误判为 book_flight，但用户其实是问价格
- **维护成本高**：每加一个意图就要补一堆关键词，关键词冲突时还要排优先级，越来越乱

### Section 4：LLM structured output 实现

codeBlock-python（LangChain + Pydantic 实现）：

```python
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
        f"判断用户输入的意图，并提取实体：\n{text}"
    )
    return result

# 测试
r = detect_intent_llm("我想飞上海")
print(r)
# Intent(intent='book_flight', entities={'city': '上海'}, confidence=0.9)
```

ruleBox-success：LLM 的三个优势

- **理解同义表达**：「飞上海」「去上海」「订去上海的票」都能识别为 book_flight
- **歧义可推理**：「上海的机票贵不贵」LLM 能推出意图是查询价格而非订票
- **新增意图零成本**：只需在 Pydantic Literal 里加一个枚举值 + prompt 里描述，不用维护关键词表

### Section 5：关键词 vs LLM 五维对比表 + 决策 box

compareCard 五行：

| 维度 | 关键词匹配 | LLM 分类 |
|---|---|---|
| 准确率 | 低（同义词 / 歧义全挂）| 高（理解语义）|
| 延迟 | < 1ms | 200-500ms |
| 成本 | 几乎 0 | 每次约 ¥0.001-0.01 |
| 新增意图 | 改代码 + 维护关键词表 | 改 Pydantic + prompt |
| 适用场景 | 简单 / 高频 / 延迟敏感 | 复杂 / 歧义 / 意图多 |

ruleBox-warning 选型决策：

- 关键词匹配：高频简单场景（如"转人工"指令、固定菜单）
- LLM 分类：开放性输入、意图多、需要抽取实体
- 混合策略：先用关键词快速过滤高频意图（命中即返回），未命中再调 LLM —— 兼顾成本和准确率

### Section 6：工程实践（混合策略 + prompt 设计要点）

ruleBox-info：混合策略伪代码

```python
def detect_intent_hybrid(text):
    # ① 关键词快速路径（命中即返回）
    intent = detect_intent(text)
    if intent != "chitchat":
        return intent

    # ② LLM 兜底（处理同义/歧义/闲聊）
    return detect_intent_llm(text).intent
```

ruleBox-info：prompt 设计三要点

- **意图枚举要全**：在 prompt 里列出所有意图 + 每个意图的描述和触发场景，避免 LLM 瞎猜
- **包含反例**：「'上海机票贵不贵' 是查询价格，不是订票」—— 反例比正例更能纠偏
- **要求 confidence**：让 LLM 输出置信度，低于阈值（如 0.7）转人工或追问用户

### Section 7：选型总结（ruleBox-success）

- 一句话收束：意图识别是 AI 应用的"前台接线员"，识别准了路由才对。
- 工程默认：高频简单 → 关键词；开放复杂 → LLM；预算紧 / 流量大 → 混合。
- 别为追求"先进"而用 LLM：一个"转人工"按钮用关键词 1ms 解决，LLM 反而 500ms + ¥0.01，不划算。

## 实施细节

### 文件改动清单

1. **修改** `demo/public/ai-app/data.js`
   - 在 `topics` 数组末尾追加新 topic 对象（元信息见上）
   - 不动其他 topic 和 helper

2. **新建** `demo/public/ai-app/intent-recognition.js`
   - 导出 `renderIntentRecognition(t)`，按 `what-is-agent.js` / `react-vs-cot.js` 的写法组织
   - 复用 `data.js` 全局 helper
   - 代码块语言：`python`（关键词匹配 / LLM 实现 / 混合策略）

3. **无需改动**：
   - `ai-app.html`：sidebar 由 `data.js` 动态渲染，新 topic 自动出现
   - `app.js`：`getRendererName('intent-recognition')` → `renderIntentRecognition`，懒加载脚本路径 `/ai-app/intent-recognition.js` 自动匹配
   - `vite.config.ts`：`public/` 下文件不进 rollup input，无需登记

### 验证方式

1. dev server 已在运行（`http://localhost:5173/`）
2. 浏览器打开 `http://localhost:5173/ai-app.html`
3. 左侧 sidebar 的"🤖 Agent"分组底部应出现"🎯 意图识别"
4. 点击进入，确认：
   - 7 个 section 按顺序渲染
   - Python 代码块语法高亮正常
   - compareCard 五维对比表 3 列对齐、5 行数据
   - 与现有 5 个 topic 切换正常，无 JS 报错
5. 移动端窄屏（< 700px）下 sidebar 折叠正常，ruleBox / code block 自适应

### 不做的事（YAGNI）

- 不写测试（项目无测试脚本，demo 手动验证）
- 不动 `global-topics.js`（hub 首页全局索引，ai-app 内部 topic 不进 hub）
- 不改 `ai-app.html` 样式
- 不实现"意图分类模型（BERT fine-tune）"方案（与"关键词 vs LLM 对比"选择不符）
- 不实现"意图识别 + 路由到不同 chain"完整代码（用户选的是关键词 vs LLM 对比，不是路由）

## 依赖关系

- 新 topic 与现有 5 个 topic 互不依赖，可在不动现有代码的前提下增量添加。
- 新 topic 文件命名遵循 `app.js` 的懒加载约定（`getRendererName` 把 `intent-recognition` → `renderIntentRecognition`，脚本路径 `/ai-app/intent-recognition.js`）。
