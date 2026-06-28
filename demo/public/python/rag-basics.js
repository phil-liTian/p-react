function renderRagBasics(t) {
  const intro = ruleBox('accent',
    `RAG（<strong>Retrieval-Augmented Generation，检索增强生成</strong>）将信息检索与大语言模型结合：系统先从知识库检索与问题相关的片段，再把片段和原始问题一起喂给 LLM，让模型基于<strong>检索证据</strong>回答，而不是只靠训练时记住的知识。`);

  const whySection = section('为什么需要 RAG？', `
    <ul>
      <li><strong>知识时效性</strong>：LLM 知识截止于训练数据时间点，RAG 动态检索外部知识源，让模型获取最新内容。</li>
      <li><strong>私有数据访问</strong>：企业内部文档不可能暴露给公开 LLM，RAG 只在请求时提取相关片段，无需暴露全量数据。</li>
      <li><strong>幻觉问题</strong>：RAG 通过提供明确参考文本降低幻觉概率，但无法彻底消除，生产级系统还需引用校验、答案评估和拒答机制。</li>
    </ul>`);

  const workflowRows = [
    ['离线索引', '文档清理 → 增强元数据 → 文档切块（Chunking）→ Embedding → 存入向量库'],
    ['在线检索', '接收请求 → 查询向量化 → 相似度检索（R）→ 上下文增强（A）→ LLM 生成（G）→ 可选反馈'],
  ];

  const workflowTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">阶段</div>
        <div class="compare-card-header-cell python">核心步骤</div>
      </div>
      ${workflowRows.map(([stage, steps]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">${escHtml(stage)}</div>
        <div class="compare-card-cell python">${escHtml(steps)}</div>
      </div>`).join('')}
    </div>`;

  const workflowSection = section('工作原理：两阶段链路', workflowTable + `
    <p style="margin-top:12px;color:var(--text-secondary);font-size:13px;">
      <strong>Chunking 策略</strong>影响召回质量：Chunk 太大引入噪声，太小丢上下文。<br>
      <strong>查询改写 / HyDE</strong> 可在检索前优化 query，提升命中率。
    </p>`);

  const embeddingSection = section('Embedding 是什么？', `
    <p>Embedding 把文本映射到高维稠密向量空间，<strong>语义接近的文本在向量空间中距离更近</strong>。</p>
    ${compareCard([
      ['OpenAI text-embedding-3-small', '1536 维', '闭源 API，开箱即用，多语言效果好'],
      ['OpenAI text-embedding-3-large', '3072 维', '闭源 API，支持 dimensions 参数降维'],
      ['BGE / GTE / E5 系列', '可变',   '开源模型，适合私有化部署、控制成本'],
    ], ['模型', '维度', '适合场景'])}
    <p style="margin-top:8px;color:var(--text-secondary);font-size:13px;">
      选型建议：别只看 MTEB 榜单，用自己的业务问题评测召回率、相关性和延迟。
    </p>`);

  const similarityRows = [
    ['余弦相似度', '看向量方向是否一致', 'RAG 场景最常用，对向量长度不敏感'],
    ['内积（Dot Product）', '对应维度乘积之和', '向量已 L2 归一化时，排序结果与余弦相似度通常等价'],
    ['欧氏距离（L2）', '空间中的绝对距离', '对向量幅度更敏感，适合按 L2 训练/优化的场景'],
  ];

  const similaritySection = section('向量相似度计算', compareCard(similarityRows, ['度量方式', '含义', '特点']) + `
    <p style="margin-top:8px;color:var(--text-secondary);font-size:13px;">
      面试答法：RAG 关注语义方向而非长度，余弦相似度对长度不敏感，更适合文本语义检索。实际项目需与 Embedding 模型推荐的距离度量、向量库索引类型保持一致。
    </p>`);

  const vsSearchRows = [
    ['检索机制', '倒排索引 + BM25 关键词匹配', '向量检索 / BM25 / 混合检索均可，结果进入 LLM 上下文'],
    ['结果形态', '文档列表，用户自行阅读判断', '直接生成答案，标注引用来源'],
    ['成本/延迟', '极低，容易扩展', '更高，需检索 + LLM 推理'],
    ['可控性',   '强，直接给原文链接', '弱一些，需引用与评测'],
    ['适用场景', '找文档/模板/制度原文', '客服解答、技术排障、制度解读、跨文档总结'],
  ];

  const vsSearchSection = section('RAG vs 传统搜索引擎', compareCard(vsSearchRows, ['维度', '传统搜索', 'RAG']));

  const vsFinetuneRows = [
    ['知识更新', '更新知识库/索引即可', '通常需重新准备数据并训练'],
    ['幻觉控制', '可引用原文，便于溯源', '模型仍可能编造，引用来源不天然可见'],
    ['成本结构', '检索 + Token + 向量库成本', '数据标注、训练 GPU、评测和版本管理成本'],
    ['适合场景', '知识密集型问答、实时信息', '风格适配、格式控制、固定任务行为优化'],
    ['主要风险', '检索不到、召回噪声、权限过滤复杂', '数据过拟合、知识过期、训练成本高'],
  ];

  const vsFinetuneSection = section('RAG vs 微调（Fine-tuning）', compareCard(vsFinetuneRows, ['维度', 'RAG', '微调']) + `
    <p style="margin-top:8px;color:var(--text-secondary);font-size:13px;">
      <strong>组合方案</strong>：先微调让模型更懂领域术语和输出格式，再用 RAG 提供实时知识和可追溯证据。知识变动频繁、需要引用来源 → 优先 RAG；输出风格不稳定 → 考虑微调；团队资源有限 → 先把 RAG 做稳。
    </p>`);

  const evolutionRows = [
    ['Naive RAG',    '文档切块 → Embedding → Top-K 检索 → LLM 生成', '最基础，适合 Demo，离生产通常还有距离'],
    ['Advanced RAG', 'Query Rewrite / HyDE → 混合检索 → Rerank → 上下文压缩 → LLM 生成', '解决召回不准、上下文噪声和排序不稳'],
    ['Modular RAG',  '检索器、重排器、压缩器、路由器、生成器等模块可插拔组合', '按场景动态路由，适合生产系统和复杂 Agent'],
  ];

  const evolutionSection = section('RAG 演进阶段', compareCard(evolutionRows, ['阶段', '典型链路', '特点']));

  const proConSection = section('核心优势与局限', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${ruleBox('success', `
        <strong>核心优势</strong>
        <ul style="margin:8px 0 0;padding-left:16px;">
          <li>知识更新成本低，只需更新知识库和索引</li>
          <li>减少幻觉，回答可挂到具体文档片段，便于溯源</li>
          <li>数据隔离容易，可在检索层实现多租户 ACL</li>
          <li>换领域成本低，建好知识库即可使用</li>
        </ul>`)}
      ${ruleBox('warning', `
        <strong>主要局限</strong>
        <ul style="margin:8px 0 0;padding-left:16px;">
          <li>检索质量决定上限，GIGO 原则：召回错，答案必错</li>
          <li>上下文过长引入噪声，"Lost in the Middle"问题</li>
          <li>完整链路延迟高（改写 → 向量化 → 检索 → 重排 → 生成）</li>
          <li>工程复杂度高：向量库维护、增量索引、评测闭环</li>
          <li>Token 成本：每次请求携带上下文，账单随片段数量上涨</li>
        </ul>`)}
    </div>`);

  const longCtxSection = section('长上下文窗口会取代 RAG 吗？', ruleBox('info', `
    <strong>不会。</strong>二者适用场景不同：
    <ul style="margin:8px 0 0;padding-left:16px;">
      <li>长上下文适合：单篇长文深度分析、代码仓库集中理解、一次性材料不多但需完整阅读的任务</li>
      <li>RAG 优势：百万到亿级文档片段（全塞不下）、权限隔离（RAG 在检索层做 ACL）、可追溯性（明确返回引用片段）</li>
      <li>上下文里塞太多无关片段，噪声干扰会让模型生成看似完整但事实不稳的答案</li>
    </ul>`));

  const body = intro + whySection + workflowSection + embeddingSection + similaritySection + vsSearchSection + vsFinetuneSection + evolutionSection + proConSection + longCtxSection;

  return articleShell(t, body);
}
