# 意图识别 Topic 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `demo/ai-app.html` 知识库的 🤖 Agent 分组末尾新增一个 topic「意图识别」，用关键词匹配 vs LLM structured output 对比讲清意图识别在 AI 应用中的位置和实现方式。

**Architecture:** 单文件渲染函数 `renderIntentRecognition(t)`，复用 `data.js` 全局 helper（ruleBox / codeBlock / compareCard / section / articleShell / escHtml），按现有 `react-vs-cot.js` 的写法组织。topic 元信息追加到 `data.js` 的 `topics` 数组末尾，sidebar 自动渲染。

**Tech Stack:** Vanilla JS（script 标签全局挂载）、LangChain Python（仅在 code block 中展示给读者）、highlight.js 语法高亮、Vite dev server。

## Global Constraints

- 项目无测试框架，验证方式为浏览器手动验证（参考 `CLAUDE.md` "无测试脚本，在 demo/ 目录下的 .ts 文件中手动验证实现"）。
- 自然语言全部用中文（参考 `~/.claude/skills/session-rules/SKILL.md`）。
- 函数命名遵循 `data.js` 已有约定：渲染函数命名为 `renderIntentRecognition`（与 `app.js` 的 `getRendererName('intent-recognition')` 自动匹配）。
- 不执行 `git commit` / `git push`（参考 `session-rules`）：计划中标注的 commit 步骤由用户本人执行。
- 复用 `data.js` 全局 helper，不新建 helper、不动 `ai-app.html` 样式、不动 `vite.config.ts`。
- 贯穿示例统一为「订机票 / 问天气 / 闲聊」三类意图，在 Section 2、3、4、5 中复用。

## File Structure

| 文件 | 责任 | 改动 |
|---|---|---|
| `demo/public/ai-app/data.js` | topic 元信息 + 共享 helper | 追加 1 个 topic 对象到 `topics` 数组末尾 |
| `demo/public/ai-app/intent-recognition.js` | 渲染 `renderIntentRecognition(t)` | 新建，7 个 section |

`app.js` 的懒加载机制会自动识别新 topic：`getRendererName('intent-recognition')` → `renderIntentRecognition`，脚本路径 `/ai-app/intent-recognition.js`。无需改 `app.js` / `ai-app.html` / `vite.config.ts`。

---

### Task 1: 追加 topic 元信息到 data.js

**Files:**
- Modify: `demo/public/ai-app/data.js`（在 `topics` 数组末尾、`react-vs-cot` 对象之后追加）

**Interfaces:**
- Produces: `topics` 数组新增一项 `id='intent-recognition'`，被 `app.js` 的 sidebar 渲染循环和懒加载机制消费。

- [ ] **Step 1: 追加 topic 对象**

在 `demo/public/ai-app/data.js` 的 `topics` 数组中，紧接 `react-vs-cot` 对象之后追加：

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
  },
```

注意：保留数组末尾的 `];` 结尾，不要破坏其他 topic 对象。

- [ ] **Step 2: 启动 dev server 并验证 sidebar**

Run: `pnpm dev`
打开: `http://localhost:5173/ai-app.html`
Expected: 左侧 sidebar「🤖 Agent」分组底部出现「🎯 意图识别」条目。点击会触发懒加载 `/ai-app/intent-recognition.js`，此时文件还不存在，浏览器 console 会有 404 报错 —— 这是预期行为，下一 Task 解决。

- [ ] **Step 3: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/data.js && git commit -m "feat(ai-app): 新增意图识别 topic 元信息"`

---

### Task 2: 创建 intent-recognition.js 骨架 + Section 1-2

**Files:**
- Create: `demo/public/ai-app/intent-recognition.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper（`ruleBox` / `section` / `articleShell` / `escHtml`）
- Produces: 全局函数 `renderIntentRecognition(t)`，被 `app.js` 通过 `window[getRendererName(id)]` 调用

- [ ] **Step 1: 创建文件，写入函数骨架 + Section 1（核心结论）+ Section 2（场景切入）**

写入 `demo/public/ai-app/intent-recognition.js`：

```js
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

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 三类意图示例', scenarioBox + scenarioWarnBox)}`);
}
```

- [ ] **Step 2: 浏览器验证 Section 1-2 渲染**

刷新 `http://localhost:5173/ai-app.html`，点击 sidebar 中的「意图识别」。
Expected:
- 文章区显示标题「意图识别」+ 4 个 tag
- 显示 2 个 section：「核心结论」（紫色 ruleBox）和「场景切入 + 三类意图示例」（蓝色 + 黄色两个 ruleBox）
- 浏览器 console 无 JS 报错

- [ ] **Step 3: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/intent-recognition.js && git commit -m "feat(ai-app): 新增 intent-recognition.js 骨架 + Section 1-2"`

---

### Task 3: 添加 Section 3（关键词匹配实现 + 局限）

**Files:**
- Modify: `demo/public/ai-app/intent-recognition.js`（在 Section 2 之后、`return` 之前插入 Section 3 内容；同时更新 `return` 的 articleShell）

**Interfaces:**
- Consumes: `data.js` 全局 helper `codeBlock`

- [ ] **Step 1: 在 `scenarioWarnBox` 之后插入 Section 3 变量**

在 `scenarioWarnBox` 声明之后、`return articleShell` 之前插入：

```js
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
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 3**

把 `return articleShell(t, ...)` 改为：

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 三类意图示例', scenarioBox + scenarioWarnBox)}
    ${section('关键词匹配实现 + 局限', keywordBlock + keywordLimitBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 3 渲染**

刷新页面，重新点击「意图识别」。
Expected:
- 第 3 个 section「关键词匹配实现 + 局限」出现
- Python 代码块语法高亮正常（关键字、字符串、注释着色）
- 代码块顶部有黄色圆点 + 标签「关键词匹配实现」
- 代码块下方是红色 ruleBox「关键词匹配的三大局限」

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/intent-recognition.js && git commit -m "feat(ai-app): 添加意图识别 Section 3 关键词匹配"`

---

### Task 4: 添加 Section 4（LLM structured output 实现）

**Files:**
- Modify: `demo/public/ai-app/intent-recognition.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper `codeBlock` / `ruleBox`

- [ ] **Step 1: 在 `keywordLimitBox` 之后插入 Section 4 变量**

```js
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
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 4**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 三类意图示例', scenarioBox + scenarioWarnBox)}
    ${section('关键词匹配实现 + 局限', keywordBlock + keywordLimitBox)}
    ${section('LLM structured output 实现', llmBlock + llmAdvBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 4 渲染**

刷新页面。
Expected:
- 第 4 个 section「LLM structured output 实现」出现
- Python 代码块语法高亮正常（Pydantic 类定义、Literal、Field、with_structured_output）
- 代码块顶部有绿色圆点 + 标签「LLM structured output 实现」
- 代码块下方是绿色 ruleBox「LLM 的三个优势」

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/intent-recognition.js && git commit -m "feat(ai-app): 添加意图识别 Section 4 LLM structured output"`

---

### Task 5: 添加 Section 5（关键词 vs LLM 五维对比表 + 决策 box）

**Files:**
- Modify: `demo/public/ai-app/intent-recognition.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper `compareCard`（3 列对比表，正合适）

- [ ] **Step 1: 在 `llmAdvBox` 之后插入 Section 5 变量**

```js
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
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 5**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 三类意图示例', scenarioBox + scenarioWarnBox)}
    ${section('关键词匹配实现 + 局限', keywordBlock + keywordLimitBox)}
    ${section('LLM structured output 实现', llmBlock + llmAdvBox)}
    ${section('关键词 vs LLM 五维对比', compareTable + decisionBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 5 渲染**

刷新页面。
Expected:
- 第 5 个 section「关键词 vs LLM 五维对比」出现
- 3 列对比表（维度 / 关键词匹配 / LLM 分类，5 行数据：准确率 / 延迟 / 成本 / 新增意图 / 适用场景）
- 对比表表头：第一列「维度」灰色，第二列「关键词匹配」蓝色，第三列「LLM 分类」紫色
- 表格下方是黄色 ruleBox「选型决策」

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/intent-recognition.js && git commit -m "feat(ai-app): 添加意图识别 Section 5 五维对比"`

---

### Task 6: 添加 Section 6-7（工程实践 + 选型总结）+ 全量验证

**Files:**
- Modify: `demo/public/ai-app/intent-recognition.js`

- [ ] **Step 1: 在 `decisionBox` 之后插入 Section 6 + Section 7 变量**

```js
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
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 6-7**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 三类意图示例', scenarioBox + scenarioWarnBox)}
    ${section('关键词匹配实现 + 局限', keywordBlock + keywordLimitBox)}
    ${section('LLM structured output 实现', llmBlock + llmAdvBox)}
    ${section('关键词 vs LLM 五维对比', compareTable + decisionBox)}
    ${section('工程实践', hybridBlock + promptBox)}
    ${section('选型总结', summaryBox)}`);
```

- [ ] **Step 3: 桌面端全量验证**

刷新 `http://localhost:5173/ai-app.html`，点击「意图识别」。
Expected:
- 7 个 section 按顺序渲染：核心结论 / 场景切入 / 关键词匹配 / LLM 实现 / 五维对比 / 工程实践 / 选型总结
- 顶部 content-header 显示「🎯 AI 应用开发 · 意图识别」，右侧 badge 显示「🤖 Agent」
- 3 个 Python 代码块（关键词匹配 / LLM 实现 / 混合策略）语法高亮正常
- compareCard 五维对比表 3 列、5 行数据
- 浏览器 console 无 JS 报错

- [ ] **Step 4: 切换 topic 验证无副作用**

依次点击 sidebar 中的其他 5 个 topic（不用 RAG 全塞上下文 / RAG 原理 / 什么是 Agent / Agent 工作原理 / ReAct 完整链路 vs CoT），再切回「意图识别」。
Expected: 每个 topic 都能正常渲染，切换不报错，新 topic 渲染状态在切换后保留（懒加载缓存机制）。

- [ ] **Step 5: 移动端窄屏验证**

打开浏览器开发者工具，切到移动端模拟（iPhone 12 / 375px 宽度），刷新页面。
Expected:
- 顶部出现汉堡菜单按钮，sidebar 默认隐藏
- 点击汉堡菜单，sidebar 从左滑出，「🤖 Agent」分组底部仍有「意图识别」
- 点击进入后，文章区单列布局，ruleBox / code block 自适应窄屏
- compareCard 在窄屏下 grid-template-columns 切换为 1fr 1fr（CSS 已有媒体查询）

- [ ] **Step 6: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/intent-recognition.js && git commit -m "feat(ai-app): 添加意图识别 Section 6-7 工程实践与总结，完成新 topic"`

---

## Self-Review

**1. Spec coverage:**
- 主题元信息（group=🤖 Agent 末尾、id=intent-recognition、4 个 tag）→ Task 1 ✓
- 7 个 section 全部覆盖 → Task 2 (S1-2) / Task 3 (S3) / Task 4 (S4) / Task 5 (S5) / Task 6 (S6-7) ✓
- 关键词匹配实现（贯穿示例：订机票/问天气/闲聊）→ Task 3 ✓
- LLM structured output 实现（同示例）→ Task 4 ✓
- 关键词 vs LLM 五维对比表 → Task 5 ✓
- 工程实践（混合策略 + prompt 设计要点）→ Task 6 ✓
- 文件改动清单（新建 intent-recognition.js / 修改 data.js / 不动其他）→ 全部对齐 ✓
- 验证方式（pnpm dev + 浏览器 + 移动端）→ Task 6 Step 3-5 ✓

**2. Placeholder scan:**
- 无 TBD / TODO / "适当处理" / "类似上面" 等占位 ✓
- 每个 code block 都是完整可粘贴的代码 ✓
- 每个验证步骤都有具体 Expected 描述 ✓

**3. Type consistency:**
- `renderIntentRecognition` 函数名贯穿 Task 1（id 推导）/ Task 2（创建）/ 与 `app.js` 的 `getRendererName('intent-recognition')` 匹配 ✓
- 全局 helper 名（`ruleBox` / `codeBlock` / `compareCard` / `section` / `articleShell` / `escHtml`）与 `data.js` 定义一致 ✓
- `compareRows` 数组结构（3 元组）与 `compareCard` 的 `rows.map(([fe, ai, desc]) => ...)` 一致 ✓
- 贯穿示例三类意图（book_flight / weather / chitchat）在 Section 2、3、4、5 一致使用 ✓
- codeBlock dotClass 颜色：S3 黄色（dot-yellow）/ S4 绿色（dot-green）/ S6 蓝色（dot-blue），与 ai-app.html CSS 定义一致 ✓

无问题。

## Execution Handoff

计划已保存到 `docs/superpowers/plans/2026-08-09-intent-recognition.md`。两种执行方式：

**1. Subagent-Driven（推荐）** — 每个 Task 派一个新 subagent 执行，Task 之间我做 review，迭代快、上下文干净
**2. Inline Execution** — 在当前会话直接执行，批量跑 + checkpoint review

你选哪种？
