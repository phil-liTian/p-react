# 查询改写 Topic 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `demo/ai-app.html` 知识库的 🔍 RAG 分组末尾新增一个 topic「查询改写」，用简单改写 vs Multi-Query vs HyDE 三种策略对比讲清查询改写在 RAG 中的位置和实现方式。

**Architecture:** 单文件渲染函数 `renderQueryRewriting(t)`，复用 `data.js` 全局 helper（ruleBox / codeBlock / compareCard / section / articleShell / escHtml），按现有 `intent-recognition.js` 的写法组织。topic 元信息追加到 `data.js` 的 `topics` 数组末尾，sidebar 自动渲染。

**Tech Stack:** Vanilla JS（script 标签全局挂载）、LangChain Python（仅在 code block 中展示给读者）、highlight.js 语法高亮、Vite dev server。

## Global Constraints

- 项目无测试框架，验证方式为浏览器手动验证（参考 `CLAUDE.md` "无测试脚本，在 demo/ 目录下的 .ts 文件中手动验证实现"）。
- 自然语言全部用中文（参考 `~/.claude/skills/session-rules/SKILL.md`）。
- 函数命名遵循 `data.js` 已有约定：渲染函数命名为 `renderQueryRewriting`（与 `app.js` 的 `getRendererName('query-rewriting')` 自动匹配）。
- 不执行 `git commit` / `git push`（参考 `session-rules`）：计划中标注的 commit 步骤由用户本人执行。
- 复用 `data.js` 全局 helper，不新建 helper、不动 `ai-app.html` 样式、不动 `vite.config.ts`。
- 贯穿示例统一为「GPT-4 怎么收费」，在 Section 2、3、4、5、6 中复用。

## File Structure

| 文件 | 责任 | 改动 |
|---|---|---|
| `demo/public/ai-app/data.js` | topic 元信息 + 共享 helper | 追加 1 个 topic 对象到 `topics` 数组末尾 |
| `demo/public/ai-app/query-rewriting.js` | 渲染 `renderQueryRewriting(t)` | 新建，7 个 section |

`app.js` 的懒加载机制会自动识别新 topic：`getRendererName('query-rewriting')` → `renderQueryRewriting`，脚本路径 `/ai-app/query-rewriting.js`。无需改 `app.js` / `ai-app.html` / `vite.config.ts`。

---

### Task 1: 追加 topic 元信息到 data.js

**Files:**
- Modify: `demo/public/ai-app/data.js`（在 `topics` 数组末尾、`intent-recognition` 对象之后追加）

**Interfaces:**
- Produces: `topics` 数组新增一项 `id='query-rewriting'`，被 `app.js` 的 sidebar 渲染循环和懒加载机制消费。

- [ ] **Step 1: 追加 topic 对象**

在 `demo/public/ai-app/data.js` 的 `topics` 数组中，紧接 `intent-recognition` 对象之后追加：

```js
  {
    id: 'query-rewriting',
    name: '查询改写',
    group: '🔍 RAG',
    type: 'info',
    icon: '🔄',
    tags: [
      { label: '查询改写', type: 'info' },
      { label: 'Multi-Query', type: 'accent' },
      { label: 'HyDE', type: 'success' },
      { label: 'RAG 预处理', type: 'warning' },
    ],
  },
```

注意：保留数组末尾的 `];` 结尾，不要破坏其他 topic 对象。

- [ ] **Step 2: 启动 dev server 并验证 sidebar**

Run: `pnpm dev`
打开: `http://localhost:5173/ai-app.html`
Expected: 左侧 sidebar「🔍 RAG」分组底部出现「🔄 查询改写」条目。点击会触发懒加载 `/ai-app/query-rewriting.js`，此时文件还不存在，浏览器 console 会有 404 报错 —— 这是预期行为，下一 Task 解决。

- [ ] **Step 3: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/data.js && git commit -m "feat(ai-app): 新增查询改写 topic 元信息"`

---

### Task 2: 创建 query-rewriting.js 骨架 + Section 1-2

**Files:**
- Create: `demo/public/ai-app/query-rewriting.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper（`ruleBox` / `section` / `articleShell` / `escHtml`）
- Produces: 全局函数 `renderQueryRewriting(t)`，被 `app.js` 通过 `window[getRendererName(id)]` 调用

- [ ] **Step 1: 创建文件，写入函数骨架 + Section 1（核心结论）+ Section 2（场景切入）**

写入 `demo/public/ai-app/query-rewriting.js`：

```js
function renderQueryRewriting(t) {

  // ── Section 1: 核心结论 ──────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>核心结论：查询改写 = 把用户的原始查询改写成更适合检索的形式</strong><br><br>
    查询改写是 RAG 的<strong>"翻译官"</strong> —— 用户说"大白话"，知识库说"专业术语"，改写器在中间做翻译。<br><br>
    工程上一句话：<code>用户原始 query → 改写器 → 改写后 query（或多个 query）→ embedding 检索 → 拼成上下文</code>。<br><br>
    检索质量的上限由查询质量决定 —— 改写错了，后面 rerank 做得再好也救不回来。`);

  // ── Section 2: 场景切入 + 贯穿示例 ───────────────────────────────────────────

  const scenarioBox = ruleBox('info',
    `<strong>场景切入：一个 RAG 系统的"翻译"问题</strong><br><br>
    ① <strong>用户问</strong>：「GPT-4 怎么收费」<br>
    ② <strong>知识库里写的是</strong>：「OpenAI API 定价」「token 价格」「输入输出费用」<br>
    ③ <strong>直接 embedding 检索</strong>：query 和文档<strong>语义对不上</strong>（口语 vs 术语），召回率低<br><br>
    <strong>查询改写</strong>就是把「GPT-4 怎么收费」改写成「OpenAI API 定价」—— 翻译完，检索才能命中。`);

  const scenarioWarnBox = ruleBox('warning',
    `<strong>三种典型失败场景</strong><br><br>
    ① <strong>口语化</strong>：「GPT-4 怎么收费」「这个多少钱」—— 术语对不上<br>
    ② <strong>指代不清</strong>：「它支持函数调用吗」（"它"指什么？）—— 缺上下文<br>
    ③ <strong>过短 / 过长</strong>：「价格」（太短信号弱）、「我想要了解一下你们公司最新发布的产品在市场中的销售情况」（太长噪声多）<br><br>
    三种场景都需要改写器把查询<strong>"翻译"成检索友好的形式</strong>。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}`);
}
```

- [ ] **Step 2: 浏览器验证 Section 1-2 渲染**

刷新 `http://localhost:5173/ai-app.html`，点击 sidebar 中的「查询改写」。
Expected:
- 文章区显示标题「查询改写」+ 4 个 tag
- 显示 2 个 section：「核心结论」（紫色 ruleBox）和「场景切入 + 贯穿示例」（蓝色 + 黄色两个 ruleBox）
- 浏览器 console 无 JS 报错

- [ ] **Step 3: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/query-rewriting.js && git commit -m "feat(ai-app): 新增 query-rewriting.js 骨架 + Section 1-2"`

---

### Task 3: 添加 Section 3（简单改写实现 + 局限）

**Files:**
- Modify: `demo/public/ai-app/query-rewriting.js`（在 Section 2 之后、`return` 之前插入 Section 3 内容；同时更新 `return` 的 articleShell）

**Interfaces:**
- Consumes: `data.js` 全局 helper `codeBlock`

- [ ] **Step 1: 在 `scenarioWarnBox` 之后插入 Section 3 变量**

在 `scenarioWarnBox` 声明之后、`return articleShell` 之前插入：

```js
  // ── Section 3: 简单改写实现 + 局限 ──────────────────────────────────────────────

  const rewriteCode = `# LangChain + structured output 实现查询改写
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from typing import List

# 用 Pydantic 定义改写结果结构
class RewrittenQuery(BaseModel):
    rewritten_query: str = Field(description="改写后的检索友好查询")
    expanded_terms: List[str] = Field(
        description="扩展的同义术语，如 ['OpenAI API', 'token 价格']",
        default=[]
    )

llm = ChatOpenAI(model="gpt-4o", temperature=0)
structured_llm = llm.with_structured_output(RewrittenQuery)

rewrite_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个查询改写器。把用户的口语化查询改写成检索友好的形式，并补充同义术语。"),
    ("user", "{query}")
])

rewrite_chain = rewrite_prompt | structured_llm

def rewrite_query(query):
    result = rewrite_chain.invoke({"query": query})
    return result

# 测试
r = rewrite_query("GPT-4 怎么收费")
print(r)
# RewrittenQuery(
#     rewritten_query='OpenAI GPT-4 API 定价',
#     expanded_terms=['OpenAI API', 'token 价格', '输入输出费用']
# )`;

  const rewriteBlock = codeBlock('简单改写实现', 'dot-blue', 'python', rewriteCode);

  const rewriteAdvBox = ruleBox('success',
    `<strong>简单改写的三个适用场景</strong><br><br>
    ① <strong>口语化查询补全术语</strong>：「GPT-4 怎么收费」→「OpenAI API 定价」<br>
    ② <strong>指代消解</strong>（结合对话历史）：「它支持函数调用吗」→「GPT-4 支持函数调用吗」<br>
    ③ <strong>长查询压缩</strong>：「我想要了解一下你们公司最新发布的产品在市场中的销售情况」→「最新产品 销售情况」`);

  const rewriteLimitBox = ruleBox('warning',
    `<strong>简单改写的局限</strong><br><br>
    单一改写只覆盖<strong>一个语义视角</strong>，召回率有上限。<br><br>
    「GPT-4 怎么收费」改写成「OpenAI API 定价」只能命中一类文档；但用户可能也想知道「GPT-4 token 价格」「大模型调用费用」—— <strong>不同视角的文档</strong>。<br><br>
    要提升召回率上限，需要<strong>多视角改写</strong> —— 下一节 Multi-Query。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 3**

把 `return articleShell(t, ...)` 改为：

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}
    ${section('简单改写实现 + 局限', rewriteBlock + rewriteAdvBox + rewriteLimitBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 3 渲染**

刷新页面，重新点击「查询改写」。
Expected:
- 第 3 个 section「简单改写实现 + 局限」出现
- Python 代码块语法高亮正常（关键字、字符串、注释、Pydantic 类定义着色）
- 代码块顶部有蓝色圆点 + 标签「简单改写实现」
- 代码块下方依次是绿色 ruleBox「简单改写的三个适用场景」和黄色 ruleBox「简单改写的局限」

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/query-rewriting.js && git commit -m "feat(ai-app): 添加查询改写 Section 3 简单改写"`

---

### Task 4: 添加 Section 4（Multi-Query 实现）

**Files:**
- Modify: `demo/public/ai-app/query-rewriting.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper `codeBlock` / `ruleBox`

- [ ] **Step 1: 在 `rewriteLimitBox` 之后插入 Section 4 变量**

```js
  // ── Section 4: Multi-Query 实现 ───────────────────────────────────────────────

  const multiQueryCode = `# LangChain MultiQueryRetriever 实现多视角改写
from langchain_openai import ChatOpenAI
from langchain.retrievers import MultiQueryRetriever
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# ① 构建 retriever（假设已有 FAISS 索引）
vectorstore = FAISS.load_local("kb_index", OpenAIEmbeddings())
base_retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# ② 用 LLM 生成多个改写 query
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# MultiQueryRetriever 内部 prompt 默认生成 3 个改写 query
# 对「GPT-4 怎么收费」生成：
#   - "OpenAI API 定价"
#   - "GPT-4 token 价格"
#   - "大模型调用费用"
retriever = MultiQueryRetriever.from_llm(
    llm=llm,
    retriever=base_retriever,
)

# ③ 检索时自动：生成多 query → 分别检索 → 合并去重
docs = retriever.invoke("GPT-4 怎么收费")
print(f"召回 {len(docs)} 篇文档（去重后）")`;

  const multiQueryBlock = codeBlock('Multi-Query 实现', 'dot-orange', 'python', multiQueryCode);

  const multiQueryAdvBox = ruleBox('success',
    `<strong>Multi-Query 的核心优势</strong><br><br>
    ① <strong>多视角覆盖</strong>：不同改写命中不同相关文档<br>
    ② <strong>召回率显著提升</strong>（论文实验数据：召回率从 60% → 85%）<br>
    ③ <strong>去重 + 排序融合</strong>避免重复<br><br>
    「GPT-4 怎么收费」3 个视角分别命中：<br>
    • "OpenAI API 定价" → 定价总览页<br>
    • "GPT-4 token 价格" → token 计费页<br>
    • "大模型调用费用" → 对比页`);

  const multiQueryCostBox = ruleBox('info',
    `<strong>成本提示</strong><br><br>
    N 个 query = N 次 embedding + N 次检索，<strong>延迟和成本线性增长</strong>。<br><br>
    工程上默认 N=3（性价比平衡点）；N>5 收益递减，不划算。<br>
    检索结果用 rank 融合（如 RRF）去重排序，避免重复文档挤占上下文。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 4**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}
    ${section('简单改写实现 + 局限', rewriteBlock + rewriteAdvBox + rewriteLimitBox)}
    ${section('Multi-Query 实现', multiQueryBlock + multiQueryAdvBox + multiQueryCostBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 4 渲染**

刷新页面。
Expected:
- 第 4 个 section「Multi-Query 实现」出现
- Python 代码块语法高亮正常（FAISS / OpenAIEmbeddings / MultiQueryRetriever 类）
- 代码块顶部有橙色圆点 + 标签「Multi-Query 实现」
- 代码块下方依次是绿色 ruleBox「Multi-Query 的核心优势」和蓝色 ruleBox「成本提示」

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/query-rewriting.js && git commit -m "feat(ai-app): 添加查询改写 Section 4 Multi-Query"`

---

### Task 5: 添加 Section 5（HyDE 实现）

**Files:**
- Modify: `demo/public/ai-app/query-rewriting.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper `codeBlock` / `ruleBox`

- [ ] **Step 1: 在 `multiQueryCostBox` 之后插入 Section 5 变量**

```js
  // ── Section 5: HyDE 实现 ──────────────────────────────────────────────────────

  const hydeCode = `# HyDE: Hypothetical Document Embeddings
# 用 LLM 生成假想答案，用假答案的 embedding 去检索
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# ① 用 LLM 生成假想答案（hypothetical document）
llm = ChatOpenAI(model="gpt-4o", temperature=0)

hyde_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个知识库助手。根据用户查询，生成一段可能的答案（假想文档）。不要说'我不知道'，直接写最可能的答案。"),
    ("user", "{query}")
])

hyde_chain = hyde_prompt | llm

# ② HyDE 检索：用假想答案的 embedding 去检索
def hyde_retrieve(query, vectorstore, k=3):
    # 生成假想答案
    hypothetical_doc = hyde_chain.invoke({"query": query}).content
    print(f"假想答案：{hypothetical_doc[:100]}...")

    # 用假想答案去检索（不是用原始 query）
    docs = vectorstore.similarity_search(hypothetical_doc, k=k)
    return docs

# ③ 测试
vectorstore = FAISS.load_local("kb_index", OpenAIEmbeddings())
docs = hyde_retrieve("GPT-4 怎么收费", vectorstore)
# 假想答案：OpenAI GPT-4 API 定价为输入 $0.03/1K tokens，输出 $0.06/1K tokens...
# → 用这段假答案检索，命中"OpenAI API 定价"文档`;

  const hydeBlock = codeBlock('HyDE 实现', 'dot-green', 'python', hydeCode);

  const hydeAdvBox = ruleBox('success',
    `<strong>HyDE 的独特优势</strong><br><br>
    ① <strong>对短查询 / 模糊查询特别有效</strong>：原始 query 太短 embedding 信号弱，假答案信息量大<br>
    ② <strong>不需要人工设计改写 prompt</strong>：LLM 自己"想"答案<br>
    ③ <strong>原理</strong>：答案和文档都是"陈述句"，比"问句 query"和"陈述文档"匹配度更高`);

  const hydeRiskBox = ruleBox('danger',
    `<strong>HyDE 的三大风险</strong><br><br>
    ① <strong>假想答案错了会误导检索</strong>：LLM 瞎编一段错误的"假答案"，embedding 检索命中错误文档<br>
    ② <strong>延迟高</strong>：先生成假答案（几百 ms）再检索，比直接检索慢一倍<br>
    ③ <strong>成本高</strong>：生成假答案需要更多 token<br><br>
    <strong>反例</strong>：知识库是 FAQ（问句和答案一一对应），用 HyDE 生成假答案反而<strong>干扰检索</strong> —— 假答案和真答案语义打架。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 5**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}
    ${section('简单改写实现 + 局限', rewriteBlock + rewriteAdvBox + rewriteLimitBox)}
    ${section('Multi-Query 实现', multiQueryBlock + multiQueryAdvBox + multiQueryCostBox)}
    ${section('HyDE 实现', hydeBlock + hydeAdvBox + hydeRiskBox)}`);
```

- [ ] **Step 3: 浏览器验证 Section 5 渲染**

刷新页面。
Expected:
- 第 5 个 section「HyDE 实现」出现
- Python 代码块语法高亮正常（FAISS / ChatPromptTemplate / hyde_chain）
- 代码块顶部有绿色圆点 + 标签「HyDE 实现」
- 代码块下方依次是绿色 ruleBox「HyDE 的独特优势」和红色 ruleBox「HyDE 的三大风险」

- [ ] **Step 4: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/query-rewriting.js && git commit -m "feat(ai-app): 添加查询改写 Section 5 HyDE"`

---

### Task 6: 添加 Section 6-7（五维对比表 + 选型总结）+ 全量验证

**Files:**
- Modify: `demo/public/ai-app/query-rewriting.js`

**Interfaces:**
- Consumes: `data.js` 全局 helper `ruleBox`（compareCard 只支持 3 列，本节 4 列改用 inline HTML 表格，参考 `react-vs-cot.js` 的 `traceTable` 写法）

- [ ] **Step 1: 在 `hydeRiskBox` 之后插入 Section 6 + Section 7 变量**

```js
  // ── Section 6: 三种策略五维对比 ───────────────────────────────────────────────

  const compareRows = [
    ['召回率提升',   '低（1× 视角）',         '高（N× 视角）',         '中-高（假答案视角）'],
    ['延迟',         '1× LLM 调用',           '1× LLM + N× 检索',      '1× LLM（生成假答案）+ 1× 检索'],
    ['成本',         '低',                    '中（N 倍检索）',        '中（生成假答案 token 多）'],
    ['适用查询',     '口语化 / 指代不清',     '多意图 / 开放性查询',    '短查询 / 模糊查询'],
    ['实现复杂度',   '低',                    '中（需排序融合）',      '低（无融合）'],
  ];

  const compareTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1fr 1.5fr 1.5fr 1.5fr">
        <div class="compare-card-header-cell desc">维度</div>
        <div class="compare-card-header-cell frontend">简单改写</div>
        <div class="compare-card-header-cell ai">Multi-Query</div>
        <div class="compare-card-header-cell desc">HyDE</div>
      </div>
      ${compareRows.map(([dim, simple, multi, hyde]) => `
      <div class="compare-card-row" style="grid-template-columns: 1fr 1.5fr 1.5fr 1.5fr">
        <div class="compare-card-cell desc">${escHtml(dim)}</div>
        <div class="compare-card-cell frontend">${escHtml(simple)}</div>
        <div class="compare-card-cell ai">${escHtml(multi)}</div>
        <div class="compare-card-cell desc">${escHtml(hyde)}</div>
      </div>`).join('')}
    </div>`;

  const decisionBox = ruleBox('warning',
    `<strong>选型决策</strong><br><br>
    • <strong>简单改写</strong>：默认兜底，成本低<br>
    • <strong>Multi-Query</strong>：开放性查询、召回率要求高<br>
    • <strong>HyDE</strong>：短查询、模糊查询、知识库覆盖全的语义型查询<br>
    • <strong>混合策略</strong>：先用简单改写判断是否需要改写，命中条件（如 query 过短）才升级到 Multi-Query 或 HyDE<br><br>
    反例：用 Multi-Query 做"转人工"按钮查询，3 倍成本换不到召回率提升；用 HyDE 做 FAQ 检索，假答案和真答案打架。`);

  // ── Section 7: 选型总结 ──────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>一句话总结</strong><br><br>
    查询改写是 RAG 的<strong>"翻译官"</strong>，把用户说的大白话翻译成检索友好的形式。<br><br>
    <strong>工程默认决策</strong>：<br>
    • 默认 → 简单改写（成本低，覆盖大部分场景）<br>
    • 召回率要求高 → Multi-Query<br>
    • 短查询 / 模糊查询 → HyDE<br><br>
    <strong>先看知识库形态再选策略</strong>：FAQ 用简单改写就够；语义型知识库才上 HyDE；开放性查询才上 Multi-Query。<br>
    别为追求"召回率 100%"而用 Multi-Query：一个"转人工"按钮用简单改写 1× 成本解决，Multi-Query 反而 3× 成本，不划算。`);
```

- [ ] **Step 2: 更新 `return articleShell`，加入 Section 6-7**

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景切入 + 贯穿示例', scenarioBox + scenarioWarnBox)}
    ${section('简单改写实现 + 局限', rewriteBlock + rewriteAdvBox + rewriteLimitBox)}
    ${section('Multi-Query 实现', multiQueryBlock + multiQueryAdvBox + multiQueryCostBox)}
    ${section('HyDE 实现', hydeBlock + hydeAdvBox + hydeRiskBox)}
    ${section('三种策略五维对比', compareTable + decisionBox)}
    ${section('选型总结', summaryBox)}`);
```

- [ ] **Step 3: 桌面端全量验证**

刷新 `http://localhost:5173/ai-app.html`，点击「查询改写」。
Expected:
- 7 个 section 按顺序渲染：核心结论 / 场景切入 / 简单改写 / Multi-Query / HyDE / 五维对比 / 选型总结
- 顶部 content-header 显示「🔄 AI 应用开发 · 查询改写」，右侧 badge 显示「🔍 RAG」
- 3 个 Python 代码块（简单改写 / Multi-Query / HyDE）语法高亮正常
- compareCard 五维对比表 4 列、5 行数据（inline HTML 表格，列：维度 / 简单改写 / Multi-Query / HyDE）
- 浏览器 console 无 JS 报错

- [ ] **Step 4: 切换 topic 验证无副作用**

依次点击 sidebar 中的其他 6 个 topic（不用 RAG 全塞上下文 / RAG 原理 / 什么是 Agent / Agent 工作原理 / ReAct 完整链路 vs CoT / 意图识别），再切回「查询改写」。
Expected: 每个 topic 都能正常渲染，切换不报错，新 topic 渲染状态在切换后保留（懒加载缓存机制）。

- [ ] **Step 5: 移动端窄屏验证**

打开浏览器开发者工具，切到移动端模拟（iPhone 12 / 375px 宽度），刷新页面。
Expected:
- 顶部出现汉堡菜单按钮，sidebar 默认隐藏
- 点击汉堡菜单，sidebar 从左滑出，「🔍 RAG」分组底部仍有「查询改写」
- 点击进入后，文章区单列布局，ruleBox / code block 自适应窄屏
- compareCard 在窄屏下 grid-template-columns 切换为 1fr 1fr（CSS 已有媒体查询）

- [ ] **Step 6: Commit（由用户执行）**

提示用户：`git add demo/public/ai-app/query-rewriting.js && git commit -m "feat(ai-app): 添加查询改写 Section 6-7 五维对比与总结，完成新 topic"`

---

## Self-Review

**1. Spec coverage:**
- 主题元信息（group=🔍 RAG 末尾、id=query-rewriting、4 个 tag）→ Task 1 ✓
- 7 个 section 全部覆盖 → Task 2 (S1-2) / Task 3 (S3) / Task 4 (S4) / Task 5 (S5) / Task 6 (S6-7) ✓
- 简单改写实现（贯穿示例：GPT-4 怎么收费）→ Task 3 ✓
- Multi-Query 实现（同示例 3 个改写 query）→ Task 4 ✓
- HyDE 实现（同示例假想答案）→ Task 5 ✓
- 三种策略五维对比表 → Task 6 ✓
- 选型总结 → Task 6 ✓
- 文件改动清单（新建 query-rewriting.js / 修改 data.js / 不动其他）→ 全部对齐 ✓
- 验证方式（pnpm dev + 浏览器 + 移动端）→ Task 6 Step 3-5 ✓

**2. Placeholder scan:**
- 无 TBD / TODO / "适当处理" / "类似上面" 等占位 ✓
- 每个 code block 都是完整可粘贴的代码 ✓
- 每个验证步骤都有具体 Expected 描述 ✓

**3. Type consistency:**
- `renderQueryRewriting` 函数名贯穿 Task 1（id 推导）/ Task 2（创建）/ 与 `app.js` 的 `getRendererName('query-rewriting')` 匹配 ✓
- 全局 helper 名（`ruleBox` / `codeBlock` / `compareCard` / `section` / `articleShell` / `escHtml`）与 `data.js` 定义一致 ✓
- 贯穿示例「GPT-4 怎么收费」在 Section 2、3、4、5、6 一致使用 ✓
- codeBlock dotClass 颜色：S3 蓝色（dot-blue）/ S4 橙色（dot-orange）/ S5 绿色（dot-green），与 ai-app.html CSS 定义一致 ✓
- 五维对比表用 inline HTML（4 列：维度 / 简单改写 / Multi-Query / HyDE），参考 `react-vs-cot.js` 的 `traceTable` 写法；`compareCard` helper 只支持 3 列故不复用 ✓

无问题。

## Execution Handoff

计划已保存到 `docs/superpowers/plans/2026-08-09-query-rewriting.md`。两种执行方式：

**1. Subagent-Driven（推荐）** — 每个 Task 派一个新 subagent 执行，Task 之间我做 review，迭代快、上下文干净
**2. Inline Execution** — 在当前会话直接执行，批量跑 + checkpoint review

你选哪种？
