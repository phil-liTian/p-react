function renderRagPrinciple(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>RAG 原理核心结论：</strong><br><br>
    RAG 把"检索"和"生成"解耦，整条链路可以拆成三段：<strong>① Embedding 把文本变成向量</strong> → <strong>② 向量数据库做相似度检索召回 Top-K</strong> → <strong>③ Rerank 用 cross-encoder 精排</strong>，最后把重排后的片段塞进 LLM 上下文生成答案。<br><br>
    三者的关系不是"任选其一"，而是<strong>层层递进</strong>：Embedding 决定语义能不能映射出来，向量库决定能不能在大规模数据里快速召回，Rerank 决定最终喂给 LLM 的片段是不是真正相关的。<br><br>
    工程上一句话：<code>Embedding 决定下限，向量库决定速度上限，Rerank 决定精度上限</code>。`);

  // ── 整体链路 ──────────────────────────────────────────────────────────────────

  const flowRows = [
    ['① 离线索引', '文档切块 → Embedding 编码 → 写入向量库（含元数据）', '文档 → 向量 → 索引'],
    ['② 在线召回', 'Query 向量化 → ANN 检索 Top-K（如 K=20~50）', '从百万级向量中粗排召回'],
    ['③ Rerank 精排', 'Cross-Encoder 对 K 条候选逐一打分 → 取 Top-N（如 N=3~5）', '高精度但低吞吐'],
    ['④ LLM 生成', '把 Top-N 片段 + 原始 Query 拼成 Prompt → LLM 生成答案', '带引用、可溯源'],
  ];

  const flowTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1fr 2fr 1.4fr">
        <div class="compare-card-header-cell desc">阶段</div>
        <div class="compare-card-header-cell ai">核心动作</div>
        <div class="compare-card-header-cell desc">定位</div>
      </div>
      ${flowRows.map(([s, a, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1fr 2fr 1.4fr">
        <div class="compare-card-cell desc">${escHtml(s)}</div>
        <div class="compare-card-cell ai">${escHtml(a)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  // ────────────────────────────────────────────────────────────────────────────
  // 第一部分：Embedding
  // ────────────────────────────────────────────────────────────────────────────

  const embeddingIntro = ruleBox('info',
    `<strong>Embedding 是什么？</strong><br><br>
    Embedding 是一个<strong>将文本（或图像、音频）映射到固定维度稠密向量</strong>的函数 <code>f: text → R^d</code>。<br>
    核心性质：<strong>语义相近的文本在向量空间中距离更近</strong>。这是 RAG 的语义检索基础 —— 不再依赖关键词字面匹配，而是基于"意思"找相关内容。<br><br>
    例如：<code>"如何重置密码"</code> 和 <code>"忘记登录密码怎么办"</code> 关键词几乎不重叠，但 Embedding 向量会非常接近。`);

  const embeddingModelRows = [
    ['OpenAI text-embedding-3-small', '1536', '闭源 API', '多语言、开箱即用、按 Token 计费'],
    ['OpenAI text-embedding-3-large', '3072', '闭源 API', '效果更好，支持 dimensions 参数降维'],
    ['BAAI/bge-large-zh-v1.5',        '1024', '开源',     '中文场景表现强，私有化部署首选'],
    ['BAAI/bge-m3',                   '1024', '开源',     '多语言 + 多粒度 + 稠密/稀疏/ColBERT 三模式'],
    ['Alibaba GTE-large',             '1024', '开源',     '中英文均衡，MTEB 榜单常客'],
    ['intfloat/e5-mistral-7b',        '4096', '开源',     '指令式 Embedding，效果接近商业方案，但体积大'],
  ];

  const embeddingModelTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">模型</div>
        <div class="compare-card-header-cell ai">维度</div>
        <div class="compare-card-header-cell desc">类型 / 特点</div>
      </div>
      ${embeddingModelRows.map(([m, d, ty, desc]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">${escHtml(m)}</div>
        <div class="compare-card-cell ai">${escHtml(d)}</div>
        <div class="compare-card-cell desc">${escHtml(ty)} · ${escHtml(desc)}</div>
      </div>`).join('')}
    </div>`;

  const embeddingDimBox = ruleBox('warning',
    `<strong>维度越高效果越好吗？</strong><br><br>
    不一定。<strong>高维带来的语义表达能力有边际递减</strong>，但存储成本、检索延迟、向量库索引构建时间都是线性上涨。<br>
    实践经验：<br>
    • 768/1024 维已经能覆盖大多数业务场景；<br>
    • 3072 维以上通常只在知识库规模大、查询复杂度高时才划算；<br>
    • OpenAI 的 <code>dimensions</code> 参数支持降维，可以先用大维度再截断到合适大小做 A/B 评测。`);

  const distanceRows = [
    ['余弦相似度（Cosine）', '看向量方向是否一致，对长度不敏感', 'RAG 最常用，文本 Embedding 模型通常按此优化'],
    ['内积（Dot Product）', '对应维度乘积之和', '向量已 L2 归一化时排序结果与余弦等价，速度略快'],
    ['欧氏距离（L2）',      '空间中的绝对距离', '对向量幅度敏感，适合按 L2 训练的模型（部分图像/音频场景）'],
  ];

  const distanceTable = compareCard(distanceRows, ['度量方式', '含义', '适用场景']);

  const distanceBox = ruleBox('success',
    `<strong>选哪种？</strong> 跟着 Embedding 模型文档走。<br>
    OpenAI / BGE / GTE 默认推荐 <strong>余弦相似度</strong>；部分模型（如 GTE）训练时用内积，归一化后两者等价。<br>
    <strong>坑点</strong>：写入向量库时要不要做 L2 归一化，取决于选的距离度量，不要混用。`);

  const embeddingCode = `# Python: 使用 OpenAI text-embedding-3-small 生成 Embedding
from openai import OpenAI
import numpy as np

client = OpenAI()

def embed(text: str) -> np.ndarray:
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return np.array(resp.data[0].embedding, dtype=np.float32)

q  = embed("如何重置登录密码")
d1 = embed("忘记密码可以在登录页点击'找回密码'重置")
d2 = embed("今天的天气不错")

# 余弦相似度（归一化后的内积）
def cosine(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

print(cosine(q, d1))  # ≈ 0.85  语义相关
print(cosine(q, d2))  # ≈ 0.30  语义无关`;

  const embeddingLocalCode = `# 本地部署开源 Embedding（BGE-large-zh）
from FlagEmbedding import FlagModel

model = FlagModel('BAAI/bge-large-zh-v1.5',
                  use_fp16=True)  # GPU 上启用半精度加速

# BGE 推荐给 query 加前缀 "为这个句子生成表示以用于检索相关文章："
queries = ["为这个句子生成表示以用于检索相关文章：如何重置密码"]
docs = ["登录页点击'找回密码'可重置", "今天天气真好"]

q_emb = model.encode(queries)  # shape: (1, 1024)
d_emb = model.encode(docs)     # shape: (2, 1024)

# BGE 训练时用 L2 + 归一化，可以直接算内积
scores = q_emb @ d_emb.T       # [[0.85, 0.20]]`;

  const embeddingPair = codeBlocksRow([
    codeBlock('OpenAI Embedding（闭源 API）', 'dot-green', 'python', embeddingCode),
    codeBlock('开源 BGE Embedding（本地部署）', 'dot-blue', 'python', embeddingLocalCode),
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // 第二部分：向量数据库
  // ────────────────────────────────────────────────────────────────────────────

  const vectorDbIntro = ruleBox('info',
    `<strong>向量数据库是什么？</strong><br><br>
    专用的向量数据库（Vector DB）是为<strong>高维向量的存储、索引和相似度检索</strong>优化的存储系统。<br>
    与传统数据库的核心区别：传统数据库做<strong>精确匹配</strong>（<code>WHERE id = ?</code>），向量数据库做<strong>近似最近邻（ANN）检索</strong>（<code>ORDER BY vector <-> ? LIMIT K</code>）。<br><br>
    <strong>为什么不能用 MySQL/PostgreSQL 直接存向量做检索？</strong><br>
    暴力扫描 N 个 d 维向量算距离的复杂度是 <code>O(N·d)</code>，10 万条 1024 维就要算 1 亿次乘加，毫秒级响应不可能。向量库通过<strong>近似最近邻（ANN）索引算法</strong>把复杂度降到 <code>O(log N)</code> 级别，代价是<strong>召回率 &lt; 100%</strong>。`);

  const indexRows = [
    ['FLAT（暴力扫描）',   '100%', 'O(N·d)',  '小数据集（&lt; 1万），结果完全准确，无构建成本'],
    ['IVF（倒排）',        '90~95%', 'O(√N·d)', '聚类分桶，查询只扫描最相关的几个桶'],
    ['HNSW（图索引）',     '95~99%', 'O(log N)', '层级小世界图，查询快、召回高，内存占用大'],
    ['PQ（乘积量化）',     '85~92%', 'O(N/2^m·d)', '向量压缩存储，10x 节省内存，精度有损'],
    ['IVF + PQ',          '88~94%', '极低',    '混合索引，十亿级数据常用方案'],
    ['ScaNN',             '95~97%', '低',      'Google 提出，对各向异性量化优化，工业级方案'],
  ];

  const indexTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.2fr 1fr 1fr 1.6fr">
        <div class="compare-card-header-cell ai">索引算法</div>
        <div class="compare-card-header-cell frontend">典型召回率</div>
        <div class="compare-card-header-cell frontend">查询复杂度</div>
        <div class="compare-card-header-cell desc">特点</div>
      </div>
      ${indexRows.map(([n, r, c, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.2fr 1fr 1fr 1.6fr">
        <div class="compare-card-cell ai">${escHtml(n)}</div>
        <div class="compare-card-cell frontend">${escHtml(r)}</div>
        <div class="compare-card-cell frontend">${escHtml(c)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const hnswBox = ruleBox('accent',
    `<strong>HNSW（Hierarchical Navigable Small World）—— 主流默认选择</strong><br><br>
    分层图结构：上层稀疏（长距离跳跃，快速定位），下层密集（精细搜索）。查询时从顶层入口逐层向下逼近。<br>
    优点：<strong>查询延迟低、召回率高（&gt;95%）</strong>，对实时插入友好。<br>
    代价：<strong>内存占用大</strong>（图结构本身要常驻内存），构建索引慢。<br><br>
    几乎所有主流向量库（Milvus / Qdrant / pgvector / Chroma）的默认索引都是 HNSW 或其变体。`);

  const vectorDbRows = [
    ['Faiss',     'C++/Python 库', 'HNSW/IVF/PQ', 'Facebook 出品，库而非服务，需要自己包一层'],
    ['Milvus',    '分布式服务',     '全索引类型',  'Java/Go/Python SDK，亿级数据，云原生部署'],
    ['Qdrant',    'Rust 服务',      'HNSW',        '轻量、过滤性能好，REST/gRPC API'],
    ['pgvector',  'PostgreSQL 插件','HNSW/IVFFlat','复用 PG 生态，支持事务，适合中小规模'],
    ['Chroma',    '嵌入式 / 服务',  'HNSW',        'Python 友好，本地开发首选，规模有限'],
    ['Weaviate',  '服务',           'HNSW',        '内置混合检索（BM25 + 向量），开箱即用'],
    ['Elasticsearch (dense_vector)', '服务', 'HNSW', '已有 ES 团队首选，省一套基础设施'],
  ];

  const vectorDbTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.2fr 1.2fr 1.2fr 1.8fr">
        <div class="compare-card-header-cell ai">方案</div>
        <div class="compare-card-header-cell frontend">形态</div>
        <div class="compare-card-header-cell frontend">主要索引</div>
        <div class="compare-card-header-cell desc">特点</div>
      </div>
      ${vectorDbRows.map(([n, f, idx, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.2fr 1.2fr 1.2fr 1.8fr">
        <div class="compare-card-cell ai">${escHtml(n)}</div>
        <div class="compare-card-cell frontend">${escHtml(f)}</div>
        <div class="compare-card-cell frontend">${escHtml(idx)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const vectorDbSelectBox = ruleBox('success',
    `<strong>选型建议</strong><br><br>
    • <strong>本地开发 / Demo</strong>：Chroma 或 pgvector，零部署。<br>
    • <strong>已有 PostgreSQL</strong>：pgvector，知识库 &lt; 100 万条首选，省一套基础设施。<br>
    • <strong>已有 Elasticsearch</strong>：用 ES 的 <code>dense_vector</code>，BM25 + 向量混合检索开箱即用。<br>
    • <strong>百万到亿级、需要分布式</strong>：Milvus 或 Qdrant。<br>
    • <strong>嵌入式集成、需要轻量服务</strong>：Qdrant（Rust 写的，性能与内存表现都好）。<br>
    • <strong>纯算法研究、要自己控制索引</strong>：Faiss。<br><br>
    <strong>反模式</strong>：业务还在 10 万条数据规模就上 Milvus 集群，运维成本远大于收益。`);

  const metadataBox = ruleBox('warning',
    `<strong>元数据过滤（Metadata Filtering）—— 比向量检索本身更重要</strong><br><br>
    生产级 RAG 几乎都要做<strong>预过滤</strong>：检索前先用 <code>tenant_id = ? AND doc_type = 'product' AND created_at &gt; ?</code> 缩小范围，再做 ANN。<br>
    坑点：<strong>过滤太多会导致 ANN 候选不足</strong>。比如过滤后只剩 50 条，HNSW 还是按 K=20 召回，可能漏掉真正相关的。<br>
    解决：向量库要支持<strong>过滤 + 召回扩展</strong>（先按 K × oversample 取候选，过滤后再选 Top-K），Qdrant/Milvus 都有这个能力。`);

  const pgvectorCode = `-- pgvector: 给 documents 表加向量列和 HNSW 索引
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT,
  embedding   vector(1024),    -- 与 Embedding 模型维度对齐
  tenant_id   BIGINT,
  doc_type    VARCHAR(32),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- HNSW 索引，使用余弦距离（vector_cosine_ops）
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 检索：先按 tenant_id 过滤，再按向量相似度排序
-- <=> 是余弦距离运算符，<-> 是 L2，<#> 是内积
SELECT id, content, 1 - (embedding <=> $1::vector) AS score
FROM documents
WHERE tenant_id = $2
  AND doc_type = 'product'
ORDER BY embedding <=> $1::vector
LIMIT 20;  -- 召回 Top-20，留给 Rerank 精排`;

  const qdrantCode = `# Qdrant: 创建集合并写入 + 检索
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue

client = QdrantClient(host="localhost", port=6333)

client.create_collection(
    collection_name="docs",
    vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
)

# 写入（向量 + 元数据 payload 一起存）
client.upsert(
    collection_name="docs",
    points=[
        PointStruct(id=1, vector=[0.1, ...], payload={"tenant_id": 7, "doc_type": "product", "content": "..."}),
        PointStruct(id=2, vector=[0.2, ...], payload={"tenant_id": 7, "doc_type": "news",    "content": "..."}),
    ],
)

# 检索：先按 payload 过滤，再做 ANN 召回
results = client.search(
    collection_name="docs",
    query_vector=query_vec,            # 1024 维
    query_filter=Filter(must=[
        FieldCondition(key="tenant_id", match=MatchValue(value=7)),
        FieldCondition(key="doc_type",  match=MatchValue(value="product")),
    ]),
    limit=20,                          # 召回 Top-20
    search_params={"hnsw_ef": 128},    # HNSW 的 ef 越大召回越准、越慢
)`;

  const vectorDbPair = codeBlocksRow([
    codeBlock('pgvector（PostgreSQL 插件）', 'dot-green', 'sql', pgvectorCode),
    codeBlock('Qdrant（独立向量库）', 'dot-blue', 'python', qdrantCode),
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // 第三部分：Rerank
  // ────────────────────────────────────────────────────────────────────────────

  const rerankIntro = ruleBox('info',
    `<strong>Rerank 是什么？为什么需要它？</strong><br><br>
    Rerank 是<strong>对召回阶段的 Top-K 候选片段做精细化重排序</strong>的环节。<br><br>
    <strong>为什么需要？</strong> 召回阶段（向量检索）必须用<strong>轻量级</strong>模型才能在大规模数据里毫秒级返回，所以 Embedding 都是<strong>双塔结构</strong>（Query 和 Doc 各自编码一次），只在最后算一次相似度。这种结构速度快但<strong>无法捕捉 Query 和 Doc 的细粒度交互</strong>，容易把"看起来像但实际无关"的片段排到前面。<br><br>
    Rerank 用 <strong>Cross-Encoder</strong>：把 <code>(Query, Doc)</code> 拼在一起送进 Transformer，让注意力机制做 token 级交互，精度高得多，但<strong>计算成本也高 N 倍</strong>。所以只能用在 K 很小的精排阶段。`);

  const encoderRows = [
    ['Bi-Encoder（双塔）', 'Query 和 Doc 各自编码 → 一次向量积', 'O(N·d) 向量检索可加速', '快、可离线索引', '精度有限，无交互'],
    ['Cross-Encoder（交叉编码）', '(Query, Doc) 拼接 → 一起送进 BERT', 'O(N) 次 Transformer 前向', '精度高，token 级交互', '慢、不能离线'],
    ['Late Interaction（ColBERT）', 'Query 和 Doc 各自编码到 token 级，查询时做 MaxSim', 'O(N·Lq·Ld)', '精度接近 Cross-Encoder，可预计算', '存储大、实现复杂'],
  ];

  const encoderTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.3fr 1.6fr 1.2fr 1fr 1fr">
        <div class="compare-card-header-cell ai">架构</div>
        <div class="compare-card-header-cell frontend">计算方式</div>
        <div class="compare-card-header-cell frontend">复杂度</div>
        <div class="compare-card-header-cell desc">优点</div>
        <div class="compare-card-header-cell desc">缺点</div>
      </div>
      ${encoderRows.map(([n, c, cx, p, con]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.3fr 1.6fr 1.2fr 1fr 1fr">
        <div class="compare-card-cell ai">${escHtml(n)}</div>
        <div class="compare-card-cell frontend">${escHtml(c)}</div>
        <div class="compare-card-cell frontend">${escHtml(cx)}</div>
        <div class="compare-card-cell desc">${escHtml(p)}</div>
        <div class="compare-card-cell desc">${escHtml(con)}</div>
      </div>`).join('')}
    </div>`;

  const rerankModelRows = [
    ['Cohere Rerank 3.5',         '闭源 API', '多语言，开箱即用，按调用计费'],
    ['BAAI/bge-reranker-v2-m3',   '开源',     '多语言、轻量，本地部署首选'],
    ['BAAI/bge-reranker-v2-gemma', '开源',    '基于 Gemma，效果接近 Cohere，体积大'],
    ['jina-reranker-v2-base-multilingual', '开源', '多语言，长文档友好'],
    ['bce-reranker-base_v1',      '开源',     '中文场景表现稳定'],
  ];

  const rerankModelTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.6fr 1fr 1.8fr">
        <div class="compare-card-header-cell ai">模型</div>
        <div class="compare-card-header-cell frontend">类型</div>
        <div class="compare-card-header-cell desc">特点</div>
      </div>
      ${rerankModelRows.map(([m, ty, d]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.6fr 1fr 1.8fr">
        <div class="compare-card-cell ai">${escHtml(m)}</div>
        <div class="compare-card-cell frontend">${escHtml(ty)}</div>
        <div class="compare-card-cell desc">${escHtml(d)}</div>
      </div>`).join('')}
    </div>`;

  const rerankStrategyBox = ruleBox('accent',
    `<strong>典型参数与策略</strong><br><br>
    • <strong>召回 K</strong>：20~50（向量库 ANN 返回，要稍微大一点保证召回率）<br>
    • <strong>Rerank N</strong>：3~5（最终喂给 LLM 的片段数，受上下文窗口和 Token 成本约束）<br>
    • <strong>截断阈值</strong>：相关度分数低于阈值的直接丢弃，避免噪声片段污染 LLM<br>
    • <strong>批处理</strong>：Cross-Encoder 一次处理一个 (Q, D) 对，K 条候选要 K 次前向，可以批量 padding 提速<br><br>
    <strong>延迟预算</strong>：Rerank 通常占整条 RAG 链路 30~50% 的延迟，但<strong>能显著降低 LLM 输入 Token 数</strong>，整体成本反而下降。`);

  const cohereCode = `# Cohere Rerank API（最简单的接入方式）
import cohere

co = cohere.Client("your_api_key")

# docs 是向量库召回的 Top-K 候选
results = co.rerank(
    model="rerank-v3.5",
    query="如何重置登录密码",
    documents=docs,            # List[str]，长度 K=20
    top_n=5,                   # 重排后取前 5
    return_documents=True,
)

# results.results 按 relevance_score 降序
for r in results.results:
    print(r.index, r.relevance_score, r.document.text[:80])`;

  const bgeRerankCode = `# 本地部署 bge-reranker-v2-m3
from FlagEmbedding import FlagReranker

reranker = FlagReranker('BAAI/bge-reranker-v2-m3',
                        use_fp16=True)  # GPU 半精度

pairs = [["如何重置登录密码", doc] for doc in docs]  # List[(query, doc)]
scores = reranker.compute_score(pairs, normalize=True)  # 归一化到 0~1

# 按分数降序取 Top-N
top_n = 3
ranked = sorted(zip(scores, docs), key=lambda x: -x[0])[:top_n]
context = "\\n\\n".join([d for _, d in ranked])`;

  const rerankPair = codeBlocksRow([
    codeBlock('Cohere Rerank（闭源 API）', 'dot-green', 'python', cohereCode),
    codeBlock('BGE Reranker（本地部署）', 'dot-blue', 'python', bgeRerankCode),
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // 完整链路
  // ────────────────────────────────────────────────────────────────────────────

  const fullPipeCode = `# 一个生产可用的最小 RAG 链路
from openai import OpenAI
from qdrant_client import QdrantClient
from FlagEmbedding import FlagReranker

oai  = OpenAI()
qdr  = QdrantClient(host="localhost", port=6333)
rer  = FlagReranker('BAAI/bge-reranker-v2-m3', use_fp16=True)

def embed(text: str) -> list[float]:
    r = oai.embeddings.create(model="text-embedding-3-small", input=text)
    return r.data[0].embedding

def rag(query: str, tenant_id: int) -> str:
    # ① Query 向量化
    q_vec = embed(query)

    # ② 向量库召回 Top-20（带元数据过滤）
    hits = qdr.search(
        collection_name="docs",
        query_vector=q_vec,
        query_filter=build_tenant_filter(tenant_id),
        limit=20,
    )
    candidates = [h.payload["content"] for h in hits]

    # ③ Rerank 精排 Top-5
    pairs = [[query, c] for c in candidates]
    scores = rer.compute_score(pairs, normalize=True)
    top5 = [c for _, c in sorted(zip(scores, candidates), key=lambda x: -x[0])[:5]]

    # ④ LLM 生成（带引用）
    prompt = f"""基于以下参考资料回答问题，引用片段时标注 [片段编号]。
    若资料中没有答案，直接回答"资料中未提及"，不要编造。

    参考资料：
    {chr(10).join(f"[{i+1}] {c}" for i, c in enumerate(top5))}

    问题：{query}
    """
    resp = oai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content`;

  const fullPipeBlock = codeBlock('完整链路：召回 → Rerank → LLM 生成', 'dot-orange', 'python', fullPipeCode);

  // ────────────────────────────────────────────────────────────────────────────
  // 常见误区 / 评测 / 选型
  // ────────────────────────────────────────────────────────────────────────────

  const pitfall1 = ruleBox('danger',
    `<strong>误区一：跳过 Rerank，直接把向量库召回的 Top-K 喂给 LLM</strong><br><br>
    Bi-Encoder 的精度有限，Top-5 里经常会混入"语义相近但答非所问"的片段。<br>
    这些片段塞进 LLM 上下文会<strong>主动误导生成</strong>（"Lost in the Middle" 问题），比没有更糟。<br>
    实测数据：加了 Rerank 后答案准确率提升 15~30% 是常见水平。`);

  const pitfall2 = ruleBox('danger',
    `<strong>误区二：只看 MTEB 榜单选 Embedding 模型</strong><br><br>
    MTEB 是通用语料评测，<strong>和你的业务语料分布可能差很远</strong>。<br>
    一个在 MTEB 上排第 1 的模型，在医疗/法律/内部术语场景可能被第 10 名碾压。<br>
    正确做法：用业务真实 Query + 标注的"正确文档"做<strong>离线评测集</strong>，对比 Recall@K 和 MRR。`);

  const pitfall3 = ruleBox('warning',
    `<strong>误区三：Chunking 太大或太小</strong><br><br>
    Chunk 太大（&gt; 1000 token）：单片段语义混杂，召回时相关性分数被稀释，Token 成本飙升。<br>
    Chunk 太小（&lt; 100 token）：上下文丢失，比如只剩一句话无法判断是哪个产品的说明。<br>
    经验值：256~512 token，<strong>带 50~100 token 的 overlap</strong>（重叠窗口避免在边界切断关键句）。<br>
    进阶：<strong>按语义切分</strong>（用 NLP 检测段落边界）而非固定长度切分。`);

  const pitfall4 = ruleBox('warning',
    `<strong>误区四：不做混合检索</strong><br><br>
    纯向量检索对<strong>专有名词、型号、代码</strong>不友好（"iPhone 15 Pro Max" 这种字面查询，BM25 反而更准）。<br>
    生产 RAG 通常用 <strong>BM25 + 向量</strong> 混合检索，再交给 Rerank 统一排序。<br>
    Qdrant / Weaviate / ES 都原生支持，开启成本低。`);

  const evalRows = [
    ['Recall@K',      '前 K 个结果中包含正确文档的比例', '召回阶段核心指标，看向量库 + Embedding 质量'],
    ['MRR',           '第一个正确文档的倒数排名平均',   '衡量排序质量，Rerank 后应该明显提升'],
    ['nDCG@K',        '考虑位置折扣的归一化增益',         '更精细的排序质量，多档相关度场景常用'],
    ['Answer Faithfulness', '答案是否忠于检索片段（无幻觉）', 'RAG 专属指标，用 LLM-as-Judge 评测'],
    ['Answer Relevance',    '答案是否真正回答了问题',          '同样用 LLM-as-Judge'],
  ];

  const evalTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.8fr 1.6fr">
        <div class="compare-card-header-cell ai">指标</div>
        <div class="compare-card-header-cell frontend">含义</div>
        <div class="compare-card-header-cell desc">用途</div>
      </div>
      ${evalRows.map(([m, d, u]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.8fr 1.6fr">
        <div class="compare-card-cell ai">${escHtml(m)}</div>
        <div class="compare-card-cell frontend">${escHtml(d)}</div>
        <div class="compare-card-cell desc">${escHtml(u)}</div>
      </div>`).join('')}
    </div>`;

  const summaryBox = ruleBox('success',
    `<strong>三段式 RAG 选型清单</strong><br><br>
    <strong>Embedding</strong>：先选你能接受部署形态的（API or 开源），用业务 Query 做评测，不要只看榜单。维度 768~1024 起步。<br><br>
    <strong>向量库</strong>：知识库 &lt; 100 万 → pgvector / Chroma；百万到亿 → Milvus / Qdrant。索引默认 HNSW，<code>m=16, ef_construction=64</code> 是安全起点。<br><br>
    <strong>Rerank</strong>：必加。Cohere 最省事，BGE-reranker-v2-m3 是本地部署首选。Top-20 → Top-5 是常见配置。<br><br>
    <strong>评测先行</strong>：召回阶段看 Recall@20，排序阶段看 MRR/nDCG@5，端到端用 LLM-as-Judge 评 Faithfulness 和 Relevance。<br><br>
    <strong>失败排查顺序</strong>：召回没命中 → 查 Embedding/Chunking；命中但排序错 → 查 Rerank；排序对但答案错 → 查 LLM Prompt 和上下文组装。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('RAG 整体链路', flowTable)}
    ${section('① Embedding：语义的向量化基础', embeddingIntro + embeddingModelTable + embeddingDimBox)}
    ${section('距离度量：余弦 / 内积 / 欧氏', distanceTable + distanceBox)}
    ${section('Embedding 代码示例', embeddingPair)}
    ${section('② 向量数据库：规模化的语义检索', vectorDbIntro)}
    ${section('ANN 索引算法对比', indexTable + hnswBox)}
    ${section('主流向量库对比', vectorDbTable + vectorDbSelectBox + metadataBox)}
    ${section('向量库代码示例', vectorDbPair)}
    ${section('③ Rerank：用 Cross-Encoder 精排', rerankIntro + encoderTable + rerankModelTable + rerankStrategyBox)}
    ${section('Rerank 代码示例', rerankPair)}
    ${section('完整链路：召回 → Rerank → LLM 生成', fullPipeBlock)}
    ${section('常见误区', pitfall1 + pitfall2 + pitfall3 + pitfall4)}
    ${section('评测指标', evalTable)}
    ${section('选型清单与失败排查', summaryBox)}`);
}
