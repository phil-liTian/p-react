# 查询改写 — 设计文档

## 背景

`demo/ai-app.html` 是 AI 应用开发知识库，现有 6 个 topic（RAG ×4、Agent ×3）。其中 RAG 相关 topic（不用 RAG 全塞上下文 / RAG 原理）讲了检索流程，但没展开讲「检索前如何处理用户查询」这一关键预处理环节。

查询改写是 RAG 的"翻译官"：用户问「GPT-4 怎么收费」，知识库里写的是「OpenAI API 定价」，query 和文档语义对不上，直接 embedding 检索召回率低。改写器把用户的大白话翻译成检索友好的形式，是 RAG 质量提升的第一道关。

用户希望新增一个 topic：场景驱动叙事，代码用 LangChain + LLM 实现，覆盖简单改写 / Multi-Query / HyDE 三种策略对比，放在 🔍 RAG 分组末尾。

## 目标

新增一个 topic，让读者看完后能：

1. 说清查询改写在 RAG 中的位置（检索预处理）
2. 用 LangChain + structured output 实现一个最简的查询改写器
3. 用 LangChain MultiQueryRetriever 实现 Multi-Query 策略
4. 用 LangChain 实现一个 HyDE 改写器
5. 用五维对比表说清三种策略的差异和选型

## 方案

采用方案 A：场景驱动 + 三种策略对比。全文围绕"用户问「GPT-4 怎么收费」"展开，先用场景切入说明直接检索的问题，再分别讲简单改写、Multi-Query、HyDE 三种策略，最后以五维对比表和选型决策收束。

不选方案 B（技术演进时间线）的原因：覆盖面广但容易散，新手不好抓住主线。
不选方案 C（方法并列对比）的原因：缺少"为什么要改写"的代入，需要读者已有背景。

## 主题元信息

追加到 `demo/public/ai-app/data.js` 的 `topics` 数组末尾：

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
}
```

分组放在 `🔍 RAG` 末尾，紧接现有 4 个 RAG topic，让读者按"RAG 基础 → 检索质量优化"的顺序自然读下来。

## 文件骨架

新建 `demo/public/ai-app/query-rewriting.js`，导出 `renderQueryRewriting(t)`。复用 `data.js` 全局 helper：`ruleBox / codeBlock / compareCard / section / articleShell / escHtml`，无需 import。

7 个 section：

### Section 1：核心结论（ruleBox-accent）

- 一句话结论：**查询改写 = 把用户的原始查询改写成更适合检索的形式**，是 RAG 的预处理步骤。
- 类比：查询改写是 RAG 的"翻译官" —— 用户说"大白话"，知识库说"专业术语"，改写器在中间做翻译。
- 工程上一句话：`用户原始 query → 改写器 → 改写后 query（或多个 query）→ embedding 检索 → 拼成上下文`。

### Section 2：场景切入 + 贯穿示例

ruleBox-info + ruleBox-warning：

- ruleBox-info：场景说明
  - 用户问「GPT-4 怎么收费」
  - 知识库里写的是「OpenAI API 定价」「token 价格」「输入输出费用」
  - 直接 embedding 检索：query 和文档语义对不上（口语 vs 术语），召回率低
- ruleBox-warning：三种典型失败场景
  - ① **口语化**：「GPT-4 怎么收费」「这个多少钱」
  - ② **指代不清**：「它支持函数调用吗」（"它"指什么？）
  - ③ **过短 / 过长**：「价格」「我想要了解一下你们公司最新发布的产品在市场中的销售情况」
  - 三种场景都需要改写器把查询"翻译"成检索友好的形式。

### Section 3：简单改写

codeBlock-python（LangChain 最简改写实现，单 query 输出）：

```python
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
# )
```

ruleBox-success：简单改写的三个适用场景

- ① **口语化查询补全术语**：「GPT-4 怎么收费」→「OpenAI API 定价」
- ② **指代消解**（结合对话历史）：「它支持函数调用吗」→「GPT-4 支持函数调用吗」
- ③ **长查询压缩**：「我想要了解一下你们公司最新发布的产品在市场中的销售情况」→「最新产品 销售情况」

ruleBox-warning：简单改写的局限 —— 单一改写只覆盖一个语义视角，召回率有上限。

### Section 4：Multi-Query

codeBlock-python（LangChain MultiQueryRetriever 实现）：

```python
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
print(f"召回 {len(docs)} 篇文档（去重后）")
```

ruleBox-success：Multi-Query 的核心优势

- ① **多视角覆盖**：不同改写命中不同相关文档
- ② **召回率显著提升**（论文实验数据：召回率从 60% → 85%）
- ③ **去重 + 排序融合**避免重复

ruleBox-info：成本提示 —— N 个 query = N 次 embedding + N 次检索，延迟和成本线性增长。

### Section 5：HyDE

codeBlock-python（HyDE 实现）：

```python
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
# → 用这段假答案检索，命中"OpenAI API 定价"文档
```

ruleBox-success：HyDE 的独特优势

- ① **对短查询 / 模糊查询特别有效**：原始 query 太短 embedding 信号弱，假答案信息量大
- ② **不需要人工设计改写 prompt**：LLM 自己"想"答案
- ③ **原理**：答案和文档都是"陈述句"，比"问句 query"和"陈述文档"匹配度更高

ruleBox-danger：HyDE 的三大风险

- ① **假想答案错了会误导检索**：LLM 瞎编一段错误的"假答案"，embedding 检索命中错误文档
- ② **延迟高**：先生成假答案（几百 ms）再检索，比直接检索慢一倍
- ③ **成本高**：生成假答案需要更多 token

### Section 6：三种策略五维对比表 + 决策 box

compareCard 五行：

| 维度 | 简单改写 | Multi-Query | HyDE |
|---|---|---|---|
| 召回率提升 | 低（1× 视角） | 高（N× 视角） | 中-高（假答案视角） |
| 延迟 | 1× LLM 调用 | 1× LLM + N× 检索 | 1× LLM（生成假答案）+ 1× 检索 |
| 成本 | 低 | 中（N 倍检索） | 中（生成假答案 token 多） |
| 适用查询 | 口语化 / 指代不清 | 多意图 / 开放性查询 | 短查询 / 模糊查询 |
| 实现复杂度 | 低 | 中（需排序融合） | 低（无融合） |

ruleBox-warning 选型决策：

- **简单改写**：默认兜底，成本低
- **Multi-Query**：开放性查询、召回率要求高
- **HyDE**：短查询、模糊查询、知识库覆盖全的语义型查询
- **混合策略**：先用简单改写判断是否需要改写，命中条件（如 query 过短）才升级到 Multi-Query 或 HyDE

### Section 7：选型总结（ruleBox-success）

- 一句话收束：查询改写是 RAG 的"翻译官"，把用户说的大白话翻译成检索友好的形式。
- 工程默认决策：
  - 默认 → 简单改写（成本低，覆盖大部分场景）
  - 召回率要求高 → Multi-Query
  - 短查询 / 模糊查询 → HyDE
- 反例：知识库就是 FAQ（问句和答案一一对应），用 HyDE 生成假答案反而干扰检索；用 Multi-Query 浪费成本。**先看知识库形态再选策略**。

## 实施细节

### 文件改动清单

1. **修改** `demo/public/ai-app/data.js`
   - 在 `topics` 数组末尾追加新 topic 对象（元信息见上）
   - 不动其他 topic 和 helper

2. **新建** `demo/public/ai-app/query-rewriting.js`
   - 导出 `renderQueryRewriting(t)`，按 `intent-recognition.js` / `react-vs-cot.js` 的写法组织
   - 复用 `data.js` 全局 helper
   - 代码块语言：`python`（简单改写 / Multi-Query / HyDE）

3. **无需改动**：
   - `ai-app.html`：sidebar 由 `data.js` 动态渲染，新 topic 自动出现
   - `app.js`：`getRendererName('query-rewriting')` → `renderQueryRewriting`，懒加载脚本路径 `/ai-app/query-rewriting.js` 自动匹配
   - `vite.config.ts`：`public/` 下文件不进 rollup input，无需登记

### 验证方式

1. dev server 已在运行（`http://localhost:5173/`）
2. 浏览器打开 `http://localhost:5173/ai-app.html`
3. 左侧 sidebar 的"🔍 RAG"分组底部应出现"🔄 查询改写"
4. 点击进入，确认：
   - 7 个 section 按顺序渲染
   - Python 代码块语法高亮正常
   - compareCard 五维对比表 3 列对齐、5 行数据
   - 与现有 6 个 topic 切换正常，无 JS 报错
5. 移动端窄屏（< 700px）下 sidebar 折叠正常，ruleBox / code block 自适应

### 不做的事（YAGNI）

- 不写测试（项目无测试脚本，demo 手动验证）
- 不动 `global-topics.js`（hub 首页全局索引，ai-app 内部 topic 不进 hub）
- 不改 `ai-app.html` 样式
- 不实现"查询改写 + 完整 RAG 管线"端到端代码（focus 在改写策略对比，不写检索 + 拼上下文 + 生成答案的完整链路）
- 不实现 RRF / rank fusion 算法细节（只在 Multi-Query code block 注释里提到"用 rank 融合去重"）
- 不实现"查询改写 + 对话历史指代消解"完整代码（Section 3 只在 ruleBox-success 里提到"结合对话历史"，不展开）

## 依赖关系

- 新 topic 与现有 6 个 topic 互不依赖，可在不动现有代码的前提下增量添加。
- 新 topic 文件命名遵循 `app.js` 的懒加载约定（`getRendererName` 把 `query-rewriting` → `renderQueryRewriting`，脚本路径 `/ai-app/query-rewriting.js`）。
