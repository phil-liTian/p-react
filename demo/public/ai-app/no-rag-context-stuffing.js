function renderNoRagContextStuffing(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('warning',
    `<strong>"全塞上下文"不是 RAG 的替代品，而是另一种知识注入模式</strong><br><br>
    它的本质：<strong>跳过检索环节，把整库/整文档直接喂给 LLM</strong>，让模型自己从全部材料里找答案。<br><br>
    <strong>什么时候不该用？</strong> 知识库规模大、查询明确、对成本和延迟敏感 —— 这时 RAG 几乎是必选。<br>
    <strong>什么时候反而要用？</strong> 知识规模小（&lt; 50K Token）、查询需要全局推理、知识高度互相关联、查询语义模糊难以向量召回。<br><br>
    工程上一句话：<code>规模小且任务复杂 → 全塞；规模大且查询明确 → RAG；中间地带 → 混合模式</code>。`);

  // ── 什么是全塞上下文 ──────────────────────────────────────────────────────────

  const whatIsBox = ruleBox('info',
    `<strong>Context Stuffing（上下文塞入）是什么？</strong><br><br>
    与 RAG 的核心区别：<strong>RAG 是"先检索再生成"，Stuffing 是"不检索直接全塞"</strong>。<br>
    RAG 流程：<code>Query → 向量检索 Top-K → LLM 生成</code><br>
    Stuffing 流程：<code>整库/整文档 → LLM 上下文 → LLM 生成</code><br><br>
    早期模型 8K 窗口时代，Stuffing 几乎不可行；如今 Claude 200K、Gemini 1M、GPT-4o 128K，让"小库全塞"重新成为可行选项。`);

  const stuffingRows = [
    ['Whole-Document Stuffing', '整篇文档原样塞入上下文', '文档 &lt; 模型窗口', '简单、保留完整结构', '文档必须小，超过窗口就失效'],
    ['Map-Reduce Stuffing',     '切片独立处理 → 合并结果',  '文档 &gt; 模型窗口但可切片', '可处理超长文档',    '多次 LLM 调用，成本高、易丢失全局信息'],
    ['Hierarchical Stuffing',   '分层摘要 + 关键段全文',    '复杂结构化文档',          '兼顾全局概览和细节', '实现复杂，摘要质量决定效果'],
    ['Full-Context Stuffing',   '整个知识库全部塞入',       '知识库 &lt; 模型窗口',     '无检索环节，工程简单', '每次调用都要重发全部 Token'],
  ];

  const stuffingTable = `
    <div class="compare-card">
      <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.6fr 1.2fr 1.2fr 1.4fr">
        <div class="compare-card-header-cell ai">模式</div>
        <div class="compare-card-header-cell frontend">做法</div>
        <div class="compare-card-header-cell frontend">适用规模</div>
        <div class="compare-card-header-cell desc">优点</div>
        <div class="compare-card-header-cell desc">缺点</div>
      </div>
      ${stuffingRows.map(([m, d, s, p, c]) => `
      <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.6fr 1.2fr 1.2fr 1.4fr">
        <div class="compare-card-cell ai">${escHtml(m)}</div>
        <div class="compare-card-cell frontend">${escHtml(d)}</div>
        <div class="compare-card-cell frontend">${escHtml(s)}</div>
        <div class="compare-card-cell desc">${escHtml(p)}</div>
        <div class="compare-card-cell desc">${escHtml(c)}</div>
      </div>`).join('')}
    </div>`;

  // ────────────────────────────────────────────────────────────────────────────
  // 第二部分：危害
  // ────────────────────────────────────────────────────────────────────────────

  const harm1 = ruleBox('danger',
    `<strong>危害一：上下文窗口的"物理上限"陷阱</strong><br><br>
    模型标称窗口 ≠ 实际可用窗口。<br>
    • Claude 3.5 Sonnet：200K Token，实际可用约 180K（要扣 Prompt 模板和输出预留）<br>
    • GPT-4o：128K Token，输出上限 16K，输入实际可用约 110K<br>
    • Gemini 1.5 Pro：1M Token，但超过 600K 后效果明显下降<br><br>
    <strong>关键认知</strong>：窗口是硬限制，<strong>超过就截断</strong>，截断就意味着信息丢失。RAG 通过检索只取相关片段，天然规避了这个问题。`);

  const harm2 = ruleBox('danger',
    `<strong>危害二：Token 成本爆炸（最致命的问题）</strong><br><br>
    LLM 按 Token 计费，<strong>输入 Token 也收费</strong>。全塞模式下每次查询都要重新发完整知识库。<br><br>
    <strong>算笔账</strong>：假设知识库 500K Token，GPT-4o 输入价格 $2.5/M Token<br>
    • 全塞模式：每次查询输入成本 = 500K × $2.5/M = <strong>$1.25/次</strong><br>
    • RAG 模式：召回 Top-5 ≈ 5K Token，输入成本 = 5K × $2.5/M = <strong>$0.0125/次</strong><br><br>
    <strong>100 倍成本差距</strong>。日查 1 万次的全塞应用，月成本可能从 $3750 飙到 $375,000。`);

  const harm3 = ruleBox('danger',
    `<strong>危害三：Lost in the Middle（中间遗忘）</strong><br><br>
    Liu et al. 2023 论文《Lost in the Middle: How Language Models Use Long Contexts》实验证明：<br>
    LLM 对<strong>开头和结尾</strong>的信息召回率最高，<strong>中间部分</strong>显著下降，呈 U 型曲线。<br><br>
    即使模型支持 200K 窗口，也不代表能在 200K 中<strong>找到所有相关信息</strong>。<br>
    实测：在 100K 上下文中找 5 个关键事实，错误率比在 5K 上下文中找高出 30%+。<br><br>
    RAG 把 Top-K 片段集中在 Prompt 末尾，天然利用了"结尾召回率高"的特性。`);

  const harm4 = ruleBox('warning',
    `<strong>危害四：检索精度反而下降（信息密度稀释）</strong><br><br>
    全塞模式下，相关片段被海量无关片段<strong>稀释</strong>，LLM 注意力分散。<br><br>
    类比：在 100 页书里找一段话，比在 1 页纸里找同一段话难得多。<br>
    即使书里都有这段话，"找"的过程本身就会出错。<br><br>
    RAG 通过检索<strong>提纯信息密度</strong>，让 LLM 在高密度上下文里做生成，错误率更低。`);

  const harm5 = ruleBox('warning',
    `<strong>危害五：延迟显著上升</strong><br><br>
    LLM 推理时间随输入 Token 数<strong>近似线性增长</strong>，部分模型甚至<strong>超线性</strong>（注意力机制 O(N²) 优化后仍是 O(N)）。<br><br>
    典型数据（Claude 3.5 Sonnet）：<br>
    • 5K Token 输入：TTFT ≈ 1.2 秒<br>
    • 50K Token 输入：TTFT ≈ 4.5 秒<br>
    • 200K Token 输入：TTFT ≈ 12 秒<br><br>
    TTFT（Time To First Token）从 1 秒涨到 10+ 秒，<strong>用户体验严重劣化</strong>。RAG 模式下 TTFT 通常稳定在 1~2 秒。`);

  const harm6 = ruleBox('warning',
    `<strong>危害六：知识更新成本高</strong><br><br>
    全塞模式下，知识库每次更新都要<strong>重新注入</strong>。如果做了缓存（如 Anthropic 的 Prompt Caching），还有缓存命中率问题：知识库一变，缓存全失效。<br><br>
    RAG 模式下，知识更新只需<strong>增量更新向量库</strong>：<br>
    • 新增文档 → Embedding → 写入向量库<br>
    • 删除文档 → 删除向量记录<br>
    • 修改文档 → 重新 Embedding → 覆盖<br>
    查询路径完全不变，索引增量构建成本远低于全量重发。`);

  const harm7 = ruleBox('warning',
    `<strong>危害七：安全与隐私风险</strong><br><br>
    全塞模式下<strong>所有知识都暴露给 LLM</strong>。如果 LLM 是闭源 API（OpenAI/Anthropic/Google），等于把<strong>全部知识库</strong>发给第三方。<br><br>
    多租户场景下隔离更困难：<br>
    • RAG 可以在检索阶段用 <code>tenant_id</code> 过滤，租户 A 永远看不到租户 B 的内容<br>
    • 全塞模式要么每个租户单独发完整上下文（成本爆炸），要么混在一起（数据泄露）<br><br>
    <strong>合规场景</strong>（医疗/金融/法律）几乎不可能接受全塞 + 闭源 API 的组合。`);

  // ────────────────────────────────────────────────────────────────────────────
  // 第三部分：适用场景
  // ────────────────────────────────────────────────────────────────────────────

  const sc1 = ruleBox('success',
    `<strong>场景一：知识库规模极小（&lt; 50K Token）</strong><br><br>
    比如一份产品说明书（30 页 ≈ 15K Token）、一份 API 文档、一份合同条款。<br>
    直接塞进上下文比构建 RAG 链路（Embedding + 向量库 + Rerank）<strong>便宜得多</strong>，工程复杂度也低一个量级。<br><br>
    <strong>经验值</strong>：50K Token 是粗略分水岭。低于这个规模，优先考虑全塞；高于这个规模，RAG 几乎是必选。<br>
    注意：50K 是<strong>知识库规模</strong>，不是单次查询的输入规模。全塞模式下每次查询都要发 50K。`);

  const sc2 = ruleBox('success',
    `<strong>场景二：查询需要全局推理</strong><br><br>
    典型任务：<br>
    • 跨章节总结："这份文档的核心论点是什么？"<br>
    • 全文主题分析："这份报告提到哪些风险？"<br>
    • 文档间一致性检查："这份合同的条款之间有没有冲突？"<br>
    • 多文档对比："V1 和 V2 版本的差异在哪里？"<br><br>
    这类任务的共同点：<strong>需要 LLM 看到全局，而不是局部片段</strong>。<br>
    RAG 召回的局部片段无法支持全局性任务，反而会丢失必要信息。这时全塞明显优于 RAG。`);

  const sc3 = ruleBox('success',
    `<strong>场景三：知识高度结构化且互相关联</strong><br><br>
    典型场景：合同、法律条款、技术规范、产品手册。<br>
    每一条都可能<strong>引用其他条</strong>（"参见第 3.2 节"），切片会切断引用关系。<br><br>
    例如合同第 5 条规定违约金，第 8 条规定"违约金按第 5 条计算"。如果 RAG 切片把这两条分到不同 chunk，召回时只命中第 8 条，LLM 就无法算出违约金。<br>
    整文档塞入能<strong>保留完整引用结构</strong>，避免这种"上下文断裂"。`);

  const sc4 = ruleBox('success',
    `<strong>场景四：查询语义模糊，难以向量召回</strong><br><br>
    开放式探索性查询：<br>
    • "这份文档有什么矛盾的地方？"<br>
    • "这个代码库有哪些潜在的 bug？"<br>
    • "这份设计有哪些可以改进的点？"<br><br>
    向量检索依赖 Query 与 Doc 的<strong>语义相似度</strong>，这类查询无法有效召回（"矛盾"在哪里？没有具体的语义匹配点）。<br>
    全塞让 LLM 自己决定关注点，反而能找出 RAG 召回不到的隐性信息。<br><br>
    <strong>混合策略</strong>：用全塞做开放式分析，用 RAG 做事实查询，按查询类型路由。`);

  const sc5 = ruleBox('success',
    `<strong>场景五：离线批处理任务</strong><br><br>
    不要求实时响应的离线任务：<br>
    • 文档摘要批量生成<br>
    • 历史数据归档分析<br>
    • 长报告自动审阅<br><br>
    这类任务对延迟宽容，对成本敏感度也低（离线可以慢慢跑），<strong>用大窗口模型 + 全塞，省去 RAG 工程复杂度</strong>。<br>
    配合 Prompt Caching（Anthropic）或 Context Caching（Gemini），可以把全塞的输入成本降到接近 RAG 水平。`);

  const sc6 = ruleBox('success',
    `<strong>场景六：知识库频次低、查询次数少</strong><br><br>
    比如一份内部文档每周只查几次。<br>
    构建 RAG 索引的<strong>工程成本</strong>（Embedding 服务、向量库、Rerank、评测集）可能 &gt; 直接塞上下文的 Token 成本。<br><br>
    <strong>POC 阶段</strong>常用这个策略：先全塞跑通业务流程，验证 LLM 能不能解决问题，再决定是否投入工程化做 RAG。<br>
    反模式：MVP 还没验证就花两周搭 RAG 链路，结果发现业务方向错了。`);

  // ────────────────────────────────────────────────────────────────────────────
  // 决策框架
  // ────────────────────────────────────────────────────────────────────────────

  const decisionRows = [
    ['知识库规模',       '&lt; 50K Token',              '&gt; 50K Token'],
    ['查询类型',         '全局推理、开放探索',           '事实查询、点对点检索'],
    ['查询频率',         '低频（&lt; 100/天）',          '高频（&gt; 1K/天）'],
    ['成本敏感度',       '低（或离线）',                 '高'],
    ['延迟要求',         '宽松（&gt; 5 秒可接受）',      '严格（&lt; 2 秒）'],
    ['知识结构',         '高度互相关联',                 '可切片独立'],
    ['知识更新频率',     '低（月级）',                   '高（日级）'],
    ['多租户隔离',       '单租户或可全文共享',           '需要严格隔离'],
  ];

  const decisionTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell desc">维度</div>
        <div class="compare-card-header-cell ai">全塞上下文</div>
        <div class="compare-card-header-cell frontend">RAG</div>
      </div>
      ${decisionRows.map(([d, s, r]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell desc">${escHtml(d)}</div>
        <div class="compare-card-cell ai">${escHtml(s)}</div>
        <div class="compare-card-cell frontend">${escHtml(r)}</div>
      </div>`).join('')}
    </div>`;

  // ────────────────────────────────────────────────────────────────────────────
  // 混合模式
  // ────────────────────────────────────────────────────────────────────────────

  const hybridBox = ruleBox('accent',
    `<strong>实际生产中往往是混合模式</strong><br><br>
    <strong>① RAG 召回 + 上下文压缩</strong>：召回 Top-K 后，对每个片段做摘要再塞，降低 Token 数。<br>
    <strong>② 分层 RAG</strong>：先对文档做摘要索引，召回文档级，再塞整文档（小库全塞 + 大库 RAG 的组合）。<br>
    <strong>③ Long Context RAG</strong>：用 200K 窗口模型 + RAG 召回扩大的 K（如 K=50 而不是 5），用空间换精度。<br>
    <strong>④ Stuffing + RAG</strong>：核心文档（如产品手册）全塞 + 大库（如历史工单）RAG 补充。<br>
    <strong>⑤ 查询路由</strong>：先用 LLM 判断查询类型，开放性查询走全塞，事实查询走 RAG。<br><br>
    <strong>Anthropic Prompt Caching</strong> 是混合模式的关键工具：全塞的固定上下文可以缓存（5 分钟 TTL，价格降到 1/10），让"全塞"在成本上接近 RAG。`);

  const cacheCode = `# Anthropic Prompt Caching: 让全塞模式成本可控
import anthropic

client = anthropic.Anthropic()

# 知识库作为缓存前缀（cache_control），后续查询只发 Question 部分
# 缓存命中后，前缀部分按 1/10 价格计费
resp = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "你是文档分析助手。基于以下知识库回答问题。",
        },
        {
            "type": "text",
            "text": KNOWLEDGE_BASE,  # 500K Token 的知识库
            "cache_control": {"type": "ephemeral"}  # 5 分钟 TTL 缓存
        }
    ],
    messages=[{
        "role": "user",
        "content": "这份合同有哪些风险条款？"
    }]
)

# 第一次调用：全价（500K × $3/M = $1.5）
# 后续 5 分钟内调用：缓存命中（500K × $0.3/M = $0.15）
# 10 倍成本节省，让"全塞"在高频场景也可行`;

  const cacheBlock = codeBlock('Prompt Caching 让全塞成本可控', 'dot-orange', 'python', cacheCode);

  // ────────────────────────────────────────────────────────────────────────────
  // 常见误区
  // ────────────────────────────────────────────────────────────────────────────

  const pitfall1 = ruleBox('danger',
    `<strong>误区一："模型窗口够大就不用 RAG"</strong><br><br>
    <strong>错</strong>。200K ≠ 200K 都能用好。<br>
    • Lost in the Middle 问题依然存在<br>
    • Token 成本依然不可控<br>
    • 延迟依然随上下文增长<br>
    • 大窗口只是<strong>扩大了"小库全塞"的边界</strong>，并没有让"大库全塞"成为可行方案。<br>
    一个粗略的经验：实际可用窗口 ≈ 标称窗口 × 0.5。`);

  const pitfall2 = ruleBox('danger',
    `<strong>误区二："RAG 总是更好的"</strong><br><br>
    <strong>错</strong>。RAG 有自己的盲区：<br>
    • 全局推理任务召回不到必要信息<br>
    • 高度关联的结构化文档被切片切断<br>
    • 开放性查询无法有效召回<br>
    • 工程复杂度高（Embedding + 向量库 + Rerank + 评测）<br><br>
    <strong>不要为了用 RAG 而用 RAG</strong>。先评估任务类型和知识规模，再决定。小库 + 复杂推理任务，全塞可能更好。`);

  const pitfall3 = ruleBox('warning',
    `<strong>误区三："全塞等于无检索"</strong><br><br>
    <strong>错</strong>。即使全塞，也可以做<strong>预处理</strong>：<br>
    • 文档摘要：先摘要再塞，降低 Token 数<br>
    • 信息抽取：从原文抽取关键实体/关系，结构化后塞入<br>
    • 分层组织：先摘要索引，命中后再塞对应章节<br><br>
    全塞前的"知识预处理"和 RAG 的"检索"是<strong>互补的</strong>，不是非此即彼。<br>
    高级的"全塞"系统往往有复杂的预处理管线。`);

  // ────────────────────────────────────────────────────────────────────────────
  // 选型清单
  // ────────────────────────────────────────────────────────────────────────────

  const summaryBox = ruleBox('success',
    `<strong>选型决策清单</strong><br><br>
    <strong>第一步：评估知识库规模</strong><br>
    Token 数 &lt; 50K → 优先全塞；&gt; 200K → 几乎必选 RAG；中间地带看下一步。<br><br>
    <strong>第二步：评估查询类型</strong><br>
    全局推理 / 开放探索 → 倾向全塞；事实查询 / 点对点检索 → 倾向 RAG。<br><br>
    <strong>第三步：评估查询频率与延迟要求</strong><br>
    高频 / 严格延迟 → RAG；低频 / 宽松延迟 → 可全塞。<br><br>
    <strong>第四步：评估预算</strong><br>
    配合 Prompt Caching，全塞的边际成本可降到接近 RAG；不配合则全塞成本可能高 10~100 倍。<br><br>
    <strong>第五步：优先考虑混合模式</strong><br>
    纯全塞和纯 RAG 都是极端，生产系统往往是 Stuffing + RAG 的组合，按查询类型路由。<br><br>
    <strong>失败排查顺序</strong>：全塞答案错 → 检查 Prompt 和 Lost in the Middle；RAG 答案错 → 检查召回和排序；两者都错 → 重新评估任务是否适合 LLM。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('什么是"全塞上下文"', whatIsBox + stuffingTable)}
    ${section('危害一：上下文窗口物理上限', harm1)}
    ${section('危害二：Token 成本爆炸', harm2)}
    ${section('危害三：Lost in the Middle', harm3)}
    ${section('危害四：检索精度反而下降', harm4)}
    ${section('危害五：延迟显著上升', harm5)}
    ${section('危害六：知识更新成本高', harm6)}
    ${section('危害七：安全与隐私风险', harm7)}
    ${section('适用场景一：知识库规模极小', sc1)}
    ${section('适用场景二：查询需要全局推理', sc2)}
    ${section('适用场景三：知识高度互相关联', sc3)}
    ${section('适用场景四：查询语义模糊', sc4)}
    ${section('适用场景五：离线批处理任务', sc5)}
    ${section('适用场景六：知识库频次低', sc6)}
    ${section('决策框架：全塞 vs RAG', decisionTable)}
    ${section('混合模式：两全其美', hybridBox + cacheBlock)}
    ${section('常见误区', pitfall1 + pitfall2 + pitfall3)}
    ${section('选型决策清单', summaryBox)}`);
}
