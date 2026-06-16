function renderRagVector(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>RAG（Retrieval-Augmented Generation，检索增强生成）是解决 LLM <strong>"知识截止日期"和"幻觉"</strong>两大核心问题的主流方案。
    工作原理：<strong>把私有文档转成向量存入数据库 → 用户提问时检索最相关片段 → 将片段注入 Prompt → 让 LLM 基于真实文档回答</strong>。
    前端工程师的落地场景：代码库问答、文档搜索助手、客服知识库。`);

  const principle = `
    <p><strong>RAG 完整流程（两个阶段）：</strong></p>
    <p><strong>① 索引阶段（离线，构建知识库）：</strong></p>
    <ol style="padding-left:20px;line-height:2.1;">
      <li><strong>文档加载</strong>：读取 PDF、Markdown、代码文件、网页等原始数据</li>
      <li><strong>文本切割（Chunking）</strong>：将长文档切成 512-1024 token 的片段，保留语义完整性</li>
      <li><strong>向量化（Embedding）</strong>：用 Embedding 模型将每个片段转成高维向量（如 1536 维的浮点数组）</li>
      <li><strong>存储</strong>：向量 + 原文片段存入向量数据库（Pinecone、Qdrant、Chroma 等）</li>
    </ol>
    <p><strong>② 查询阶段（在线，回答用户）：</strong></p>
    <ol style="padding-left:20px;line-height:2.1;">
      <li><strong>问题向量化</strong>：将用户问题用同一个 Embedding 模型转成向量</li>
      <li><strong>相似度检索</strong>：在向量数据库中找最接近的 Top-K 片段（余弦相似度）</li>
      <li><strong>构建 Prompt</strong>：将检索到的片段作为上下文注入 Prompt</li>
      <li><strong>LLM 生成</strong>：让 LLM 基于上下文回答，同时引用来源</li>
    </ol>`;

  const vectorCode = `// 向量相似度搜索原理

// 文本 → 向量（1536 维的浮点数组）
// "React 的 Fiber 架构" → [0.023, -0.145, 0.891, ...]

// 余弦相似度：衡量两个向量方向的接近程度
// cos(θ) = (A·B) / (|A| × |B|)，值域 [-1, 1]
// 1 = 完全相同方向（语义最相关），0 = 不相关，-1 = 语义相反

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
}

// 示例：查询"什么是 Virtual DOM"
// 问题向量 q = embed("什么是 Virtual DOM")
// 数据库中向量 v1 = embed("Virtual DOM 是内存中的 DOM 树...")  → similarity: 0.92
// 数据库中向量 v2 = embed("React 的 Fiber 架构...")           → similarity: 0.71
// 数据库中向量 v3 = embed("CSS Grid 布局教程...")              → similarity: 0.12
// 取 Top-2：v1, v2 作为上下文注入 Prompt`;

  const ragCode = `// RAG 完整实现示例（使用 Vercel AI SDK + OpenAI）
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// ── 索引阶段：将文档向量化并存储 ──────────────────────────
async function indexDocuments(docs) {
  // 1. 文档切割：每段 ~500 字符，50 字符重叠（保留上下文连贯性）
  const chunks = docs.flatMap(doc => chunkText(doc.content, 500, 50)
    .map((text, i) => ({ text, source: doc.title, chunkIndex: i })));

  // 2. 批量向量化（节省 API 调用次数）
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: chunks.map(c => c.text),
  });

  // 3. 存入向量数据库（此处用内存简化）
  return chunks.map((chunk, i) => ({
    ...chunk,
    vector: embeddings[i],
  }));
}

// ── 查询阶段：检索 + 生成 ─────────────────────────────────
async function ragQuery(question, vectorStore) {
  // 1. 问题向量化
  const { embedding: queryVec } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: question,
  });

  // 2. Top-3 相似度检索
  const topChunks = vectorStore
    .map(doc => ({ ...doc, score: cosineSimilarity(queryVec, doc.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // 3. 构建 Prompt（将检索到的片段作为上下文）
  const context = topChunks
    .map((c, i) => \`[来源 \${i+1}：\${c.source}]\\n\${c.text}\`)
    .join('\\n\\n');

  // 4. 调用 LLM 生成答案
  return \`根据以下文档内容回答问题：

\${context}

问题：\${question}

请基于上述文档内容回答，如果文档中没有相关信息请明确说明。\`;
}`;

  const chunkCode = `// 文本切割策略对比（Chunking Strategy）

// ── 固定大小切割（简单但可能截断语义）──────────────────
function chunkBySize(text, size, overlap = 0) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

// ── 语义切割（按段落/标题，保留结构）──────────────────
function chunkByParagraph(markdown) {
  // 按 ## 标题分割，每个小节作为一个 chunk
  return markdown
    .split(/\\n(?=##)/)
    .filter(s => s.trim())
    .map(s => s.trim());
}

// ── 代码文件切割（按函数/类分割，前端常用）─────────────
function chunkByFunction(code) {
  // 简化版：按导出函数分割
  return code
    .split(/(?=^export (function|const|class))/m)
    .filter(s => s.trim());
}

// 实践建议：
// - 普通文档：段落切割 + 适当重叠（100-200 字符）
// - Markdown 文档：按标题层级切割，保留标题作为上下文
// - 代码库：按函数/类切割，附带文件路径和函数签名`;

  const notes = [
    ruleBox('warning', `<strong>Chunking 是 RAG 质量最关键的环节：</strong>切割太细——单个 chunk 丢失上下文，检索到片段但 LLM 看不懂；切割太粗——超过 LLM 上下文窗口，且相关内容被稀释。经验值：技术文档 512-1024 token，代码文件按函数切割并附带文件路径作为元数据。`),
    ruleBox('info', `<strong>向量数据库选型：</strong>本地开发/小规模用 <strong>Chroma</strong>（本地运行，无需账号）；生产环境首选 <strong>Qdrant</strong>（开源，性能好，支持 self-host）或 <strong>Pinecone</strong>（托管服务，零运维）。前端全栈项目通常用 Qdrant + Docker 或 Supabase pgvector（PostgreSQL 扩展）。`),
    ruleBox('success', `<strong>RAG 的局限与替代方案：</strong>当文档量少（<20 篇）时，直接把所有文档塞进长上下文窗口（如 Claude 的 200K token 上下文）比 RAG 简单且效果更好——省去了向量化和检索的复杂性。RAG 的优势在于：文档量大（>1000 篇）、实时更新的知识库、需要精确引用来源。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('向量相似度搜索原理', 'dot-blue', 'javascript', vectorCode) + codeBlock('RAG 完整实现', 'dot-green', 'javascript', ragCode) + codeBlock('文本切割策略', 'dot-yellow', 'javascript', chunkCode))}
    ${section('注意事项', notes.join(''))}`);
}
