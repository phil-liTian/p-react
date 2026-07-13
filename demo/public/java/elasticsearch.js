function renderElasticsearch(t) {
  const conclusion = ruleBox('accent',
    `<strong>Elasticsearch（简称 ES）= 分布式搜索引擎 + 全文检索数据库，基于 Apache Lucene 构建。</strong><br><br>
    它解决的核心问题：<strong>"MySQL 的 LIKE 查询太慢、太弱"</strong>。<br>
    • <strong>慢</strong>：MySQL 的 <code>WHERE name LIKE '%关键词%'</code> 全表扫描，10 万行就开始卡<br>
    • <strong>弱</strong>：不能按相关性排序、不能分词（搜"开发"匹配不到"开发者"）、不支持聚合统计<br><br>
    ES 把数据建"倒排索引"，1 亿行数据中搜"开发"只需毫秒级；同时支持中文分词、相关性打分、聚合分析。<br><br>
    前端类比：ES ≈ 后端版的 <code>Algolia</code> / <code>Meilisearch</code> / <code>Lunr.js</code>——专门的搜索引擎，比数据库 LIKE 强大得多。`);

  // ── Section 1: 为什么需要 ES（对比 MySQL）──────────────────────────────────────

  const whyRows = [
    ['LIKE %关键词%',          '全表扫描，10w+ 慢',     '1ms ~ 100ms（命中索引）',   '✅ 倒排索引'],
    ['中文分词',                '❌ 不支持',              '✅ "开发者"能搜出"开发"',   '✅ IK 分词器'],
    ['相关性打分',              '❌ 只有匹配/不匹配',     '✅ 按 TF-IDF/BM25 排序',    '✅ _score 字段'],
    ['高亮显示',                '❌ 手动处理',             '✅ 自动 <em>关键词</em>',   '✅ highlight'],
    ['多字段聚合',              'GROUP BY 慢',            '✅ 毫秒级 facet 聚合',      '✅ aggregations'],
    ['同义词/拼音搜索',          '❌ 不支持',              '✅ 配置分词器',             '✅ analyzer'],
    ['地理坐标搜索',            '❌ 难做',                '✅ geo_distance',           '✅ 地理类型'],
    ['自动补全',                '❌ 难做',                '✅ suggest / completion',   '✅ suggester'],
    ['日志检索（PB 级）',       '❌ 不现实',              '✅ + Kibana 形成 ELK',     '✅ 海量日志'],
  ];
  const whyTable = compareCard(whyRows, ['MySQL LIKE', '痛点', 'ES 方案', '能力']);

  // ── Section 2: 核心概念（对比 MySQL）──────────────────────────────────────────

  const conceptBox = ruleBox('info',
    `<strong>理解 ES 最好从 MySQL 概念迁移：</strong>ES 的术语和 MySQL 几乎一一对应，只是叫法不同。<br>
    记住这个对照表，看 ES 文档就不会迷路。`);

  const conceptRows = [
    ['Index',        '索引',      'Database',      '库',     '一个 ES 实例可建多个索引'],
    ['Type',         '类型',      'Table',         '表',     'ES 7.x 后已废弃，一个索引只有一种类型'],
    ['Document',     '文档',      'Row',           '行',     '一条 JSON 数据，ES 最小单位'],
    ['Field',        '字段',      'Column',        '列',     'JSON 的 key，支持多种类型'],
    ['Mapping',      '映射',      'Schema',        '表结构',  '定义字段类型、分词器等'],
    ['Shard',        '分片',      '分表',          '水平拆分', '把大索引切成多块存不同节点'],
    ['Replica',      '副本',      '主从复制',      '高可用',  '每个分片的备份，主分片挂了顶上'],
    ['Cluster',      '集群',      '主从集群',      '多节点',  '多 ES 节点组成集群，自动选主'],
    ['Node',         '节点',      'MySQL 实例',    '进程',    '一个 ES 进程，集群的一员'],
    ['Near Real-time','近实时',   '—',             '—',      '写入到可搜 1s 左右（refresh 间隔）'],
  ];
  const conceptTable = compareCard(conceptRows, ['ES 术语', '中文', 'MySQL 对应', '描述', '说明']);

  // ── Section 3: 倒排索引（ES 的核心原理）─────────────────────────────────────

  const invertBox = ruleBox('warning',
    `<strong>倒排索引（Inverted Index）是 ES 速度快的根本原因。</strong><br>
    正排索引：文档 → 词（按文档查内容，像翻书）<br>
    倒排索引：词 → 文档（按词查文档，像查字典）`);

  const invertCode = `// 假设 3 条商品文档
doc 1: { id: 1, name: "Java 开发实战" }
doc 2: { id: 2, name: "Python 开发指南" }
doc 3: { id: 3, name: "前端开发手册" }

// ① 分词（用 IK 分词器）
"Java 开发实战" → ["java", "开发", "实战"]
"Python 开发指南" → ["python", "开发", "指南"]
"前端开发手册" → ["前端", "开发", "手册"]

// ② 建倒排索引（词 → 文档列表）
┌──────────┬──────────────┐
│  词项    │  文档 ID 列表 │
├──────────┼──────────────┤
│ java     │ [1]          │
│ python   │ [2]          │
│ 前端     │ [3]          │
│ 开发     │ [1, 2, 3]    │   ← 关键词在多个文档出现
│ 实战     │ [1]          │
│ 指南     │ [2]          │
│ 手册     │ [3]          │
└──────────┴──────────────┘

// ③ 搜索 "开发"
// MySQL LIKE '%开发%'：扫描全表 3 行，逐行匹配
// ES：直接查倒排索引，拿到 [1, 2, 3]，O(1) 查找

// ④ 搜索 "开发 实战"（AND 逻辑）
// 取"开发"=[1,2,3] ∩ "实战"=[1] → [1]
// 还会按相关性打分：doc1 命中两个词，得分最高，排第一`;

  // ── Section 4: REST API（一切皆 HTTP）──────────────────────────────────────

  const apiBox = ruleBox('success',
    `<strong>ES 的接口全是 RESTful HTTP + JSON——前端工程师直接 fetch 就能用，不需要 JDBC。</strong><br>
    默认端口 9200，所有操作通过 <code>http://localhost:9200/索引/类型/文档id</code> 访问。`);

  const apiCode = `# ── 索引操作 ────────────────────────────────────────────────

# 创建索引（带 mapping）
PUT /products
{
  "mappings": {
    "properties": {
      "name":     { "type": "text", "analyzer": "ik_max_word" },
      "price":    { "type": "double" },
      "tags":     { "type": "keyword" },
      "createTime": { "type": "date" }
    }
  }
}

# 查看索引
GET /products
# 删除索引
DELETE /products

# ── 文档 CRUD ──────────────────────────────────────────────

# 新增（指定 ID）
PUT /products/_doc/1
{ "name": "Java 开发实战", "price": 89.0, "tags": ["编程","Java"] }

# 新增（自动 ID）
POST /products/_doc
{ "name": "Python 开发指南", "price": 79.0 }

# 查询
GET /products/_doc/1

# 更新（部分字段）
POST /products/_update/1
{ "doc": { "price": 99.0 } }

# 删除
DELETE /products/_doc/1

# 批量操作
POST /_bulk
{"index": {"_index": "products", "_id": "2"}}
{"name": "Python 开发指南", "price": 79.0}
{"index": {"_index": "products", "_id": "3"}}
{"name": "前端开发手册", "price": 69.0}`;

  // ── Section 5: 查询 DSL（ES 的 SQL）───────────────────────────────────────

  const dslBox = ruleBox('info',
    `<strong>ES 查询用 JSON 描述，叫 Query DSL——比 SQL 表达力更强，但学习曲线更陡。</strong><br>
    分两类：<code>query</code>（相关性打分，类似 WHERE）和 <code>filter</code>（不评分只过滤，更快可缓存）。`);

  const dslCode = `# ── 1. 全文检索（最经典场景）──────────────────────────────

GET /products/_search
{
  "query": {
    "match": {
      "name": "开发实战"          # 自动分词："开发" OR "实战"，按相关性排序
    }
  },
  "highlight": {                  # 高亮匹配片段
    "fields": { "name": {} }
  }
}

# ── 2. 精确匹配（filter，不评分、可缓存）──────────────────

GET /products/_search
{
  "query": {
    "bool": {
      "filter": [                 # filter 不打分，比 must 快
        { "term":  { "tags": "Java" } },                  # 精确匹配
        { "range": { "price": { "gte": 50, "lte": 100 } } } # 范围
      ]
    }
  }
}

# ── 3. 多条件组合（bool query）────────────────────────────

GET /products/_search
{
  "query": {
    "bool": {
      "must":   [{ "match": { "name": "开发" } }],         # 必须匹配（打分）
      "filter": [{ "range": { "price": { "lte": 100 } } }],# 必须匹配（不打分）
      "must_not": [{ "term": { "tags": "下架" } }],         # 必须不匹配
      "should": [{ "match": { "tags": "畅销" } }],          # 可选（加分）
      "minimum_should_match": 1
    }
  }
}

# ── 4. 聚合统计（类似 GROUP BY + SUM）────────────────────

GET /products/_search
{
  "size": 0,                      # 0 表示不返回文档，只要聚合结果
  "aggs": {
    "by_tag": {                   # 按 tags 字段分组
      "terms": { "field": "tags", "size": 10 },
      "aggs": {
        "avg_price": { "avg": { "field": "price" } },       # 每组平均价
        "max_price": { "max": { "field": "price" } }
      }
    },
    "price_range": {              # 按价格区间分桶
      "range": {
        "field": "price",
        "ranges": [
          { "to": 50 },
          { "from": 50, "to": 100 },
          { "from": 100 }
        ]
      }
    }
  }
}`;

  // ── Section 6: Spring Boot 整合 ──────────────────────────────────────────────

  const springCode = `// 1. 引入依赖（pom.xml）
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-elasticsearch</artifactId>
</dependency>

// 2. 配置（application.yml）
spring:
  elasticsearch:
    uris: http://localhost:9200
    connection-timeout: 5s
    socket-timeout: 30s

// 3. 定义文档实体
@Document(indexName = "products")           // 索引名
public class Product {
  @Id                                       // 文档 ID
  private String id;

  @Field(type = FieldType.Text, analyzer = "ik_max_word")
  private String name;                      // 全文检索字段

  @Field(type = FieldType.Double)
  private Double price;

  @Field(type = FieldType.Keyword)          // keyword 不分词，用于精确匹配/聚合
  private List<String> tags;

  @Field(type = FieldType.Date, format = DateFormat.date_hour_minute_second)
  private LocalDateTime createTime;
}

// 4. 继承 ElasticsearchRepository，自带 CRUD
public interface ProductRepository
    extends ElasticsearchRepository<Product, String> {

  // 方法名即查询：按 name 搜索
  Page<Product> findByName(String name, Pageable pageable);

  // 按价格范围
  List<Product> findByPriceBetween(Double min, Double max);
}

// 5. 复杂查询用 ElasticsearchClient（推荐，新版 API）
@Service
@RequiredArgsConstructor
public class ProductSearchService {

  private final ElasticsearchClient client;   // Spring Boot 3 + ES 8 推荐

  public SearchResponse<Product> search(String keyword, double maxPrice) throws IOException {
    return client.search(s -> s
        .index("products")
        .query(q -> q
            .bool(b -> b
                .must(m -> m.match(f -> f.field("name").query(keyword)))
                .filter(f -> f.range(r -> r.field("price").lte(JsonData.of(maxPrice))))
            )
        )
        .highlight(h -> h.fields("name", f -> f))
        .size(20),
      Product.class
    );
  }
}

// 6. 在 Controller 暴露接口
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/products")
public class ProductController {

  private final ProductSearchService searchService;

  @GetMapping("/search")
  public List<Product> search(@RequestParam String q,
                              @RequestParam Double maxPrice) throws IOException {
    return searchService.search(q, maxPrice).hits().hits()
        .stream().map(Hit::source).toList();
  }
}`;

  // ── Section 7: 中文分词（IK 分词器）──────────────────────────────────────────

  const ikBox = ruleBox('warning',
    `<strong>ES 默认分词器对中文不友好——会把"开发实战"切成单字 "开"、"发"、"实"、"战"。</strong><br>
    中文场景必须装 <strong>IK 分词器</strong>，否则搜索效果极差。`);

  const ikCode = `# 安装 IK 分词器（在 ES plugins 目录）
./bin/elasticsearch-plugin install \\
  https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v8.x/elasticsearch-analysis-ik-8.x.zip

# 两种分词模式
# ik_smart：粗粒度，适合索引（省空间）
"开发者" → ["开发者"]

# ik_max_word：细粒度，适合搜索（召回高）
"开发者" → ["开发者", "开发", "者"]

# 测试分词效果
POST /_analyze
{
  "analyzer": "ik_max_word",
  "text": "Java 开发实战手册"
}
# 返回：["java", "开发", "实战", "手册"]

# 在 mapping 中使用
PUT /products
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "ik_max_word",        # 索引时用细粒度
        "search_analyzer": "ik_smart"     # 搜索时用粗粒度（避免过度召回）
      }
    }
  }
}`;

  // ── Section 8: 集群与分片（分布式特性）───────────────────────────────────────

  const clusterCode = `# 集群拓扑示例
Cluster: my-cluster
├── Node-1 (master-eligible, data)
│     ├── Primary Shard 0
│     ├── Primary Shard 1
│     └── Replica Shard 2 (来自 Node-3 的副本)
├── Node-2 (data)
│     ├── Primary Shard 2
│     ├── Replica Shard 0 (来自 Node-1 的副本)
│     └── Replica Shard 1 (来自 Node-1 的副本)
└── Node-3 (master-eligible, data)
      ├── Primary Shard 3
      └── Replica Shard 0

# 创建索引时指定分片和副本数
PUT /products
{
  "settings": {
    "number_of_shards":   4,    # 主分片数（创建后不可改）
    "number_of_replicas": 1     # 每个主分片的副本数（可动态改）
  }
}

# 关键概念
# • 主分片（Primary）：原始数据，分布在不同节点
# • 副本分片（Replica）：主分片的拷贝，提供高可用 + 读扩展
# • 路由：写入时 docId 哈希到某个主分片，保证均匀分布
# • 故障转移：某节点挂了，其主分片由副本顶上，集群仍可用
# • 扩展性：想存更多数据？加节点；想更高读吞吐？加副本

# 为什么 number_of_shards 创建后不能改？
# 因为路由算法是 hash(docId) % shards，改了之后旧数据找不到`;

  // ── Section 9: ELK 技术栈 ────────────────────────────────────────────────────

  const elkRows = [
    ['Elasticsearch', '存储 + 搜索',     '分布式搜索引擎',    'PB 级数据毫秒检索'],
    ['Logstash',      '日志采集 + 处理',  'ETL 管道',         '从 Kafka/文件/DB 读数据，过滤后写 ES'],
    ['Kibana',        '可视化 + 仪表盘',  'Web 界面',         '查询 ES、画图表、配置告警'],
    ['Beats',         '轻量采集器',       '部署到应用机',     'Filebeat 收日志，Metricbeat 收指标'],
    ['APM',           '应用性能监控',     '链路追踪',         'Java/Node 应用埋点，自动上报到 ES'],
  ];
  const elkTable = compareCard(elkRows, ['组件', '职责', '定位', '说明']);

  const elkFlow = `# 经典 ELK 日志架构
应用日志 → Filebeat（采集）→ Logstash（解析）→ Kafka（削峰）→ ES（存储）→ Kibana（查询）

# 比如订单系统排查问题：
# 1. 应用用 log.info 打日志到文件
# 2. Filebeat 监听日志文件，发送到 Logstash
# 3. Logstash 解析 JSON、提取 traceId、过滤敏感信息
# 4. 写入 ES 的 logs-2026.07.13 索引（按天分索引）
# 5. 开发在 Kibana 搜 "traceId:abc123" 定位问题`;

  // ── Section 10: 何时该用 / 不该用 ES ────────────────────────────────────────

  const useCaseRows = [
    ['全文搜索（电商商品、文章、文档）',  '✅ 强烈推荐',   'LIKE 查不动的场景'],
    ['日志检索（应用日志、访问日志）',     '✅ 强烈推荐',   'ELK 标配'],
    ['指标监控、APM 链路追踪',             '✅ 推荐',       'Kibana 仪表盘直观'],
    ['地理位置搜索（附近的人、门店）',     '✅ 推荐',       'geo_distance 原生支持'],
    ['海量数据的实时聚合分析',             '✅ 推荐',       'OLAP 场景'],
    ['关系型数据的事务（订单/账户）',       '❌ 不推荐',   'ES 不支持跨文档事务'],
    ['强一致性的关键业务数据',              '❌ 不推荐',   'ES 近实时，写入到可搜有 1s 延迟'],
    ['频繁更新单条记录',                    '❌ 不推荐',   'ES 更新=删+写，性能差'],
    ['复杂多表 JOIN',                       '❌ 不推荐',   'ES 不擅长 JOIN，应冗余字段'],
    ['数据量小且查询简单',                  '⚠️ 没必要',  'MySQL 足够，加 ES 反而增加维护成本'],
  ];
  const useCaseTable = compareCard(useCaseRows, ['场景', '推荐度', '原因']);

  // ── Section 11: 性能优化要点 ─────────────────────────────────────────────────

  const perfRows = [
    ['合理分片数',       '主分片数 = 数据量 / 30GB ~ 50GB',  '分片太多浪费资源，太少无法扩展'],
    ['filter 替代 query','不打分、可缓存',                   '布尔过滤场景优先用 filter'],
    ['keyword vs text', '聚合/精确匹配用 keyword',           'text 字段聚合要打开 fielddata 极耗内存'],
    ['分页避免深翻',     '用 search_after 替代 from+size',   'from=10000 后性能急剧下降'],
    ['索引按时间分',     'logs-2026.07.13 按天建索引',       '便于过期删除（ILM 自动管理）'],
    ['冷热分离',         '热数据 SSD，冷数据 HDD',           '近期日志高频查，历史低频'],
    ['批量写入',         '_bulk 一次写几百条',               '减少网络往返，吞吐量 10 倍提升'],
    ['关闭不需要的字段索引','"index": false',                 '只存不搜的字段不建倒排索引'],
    ['refresh_interval', '写入密集时调大到 30s',              '默认 1s，调大可提升写入吞吐'],
  ];
  const perfTable = compareCard(perfRows, ['优化点', '建议', '原因']);

  // ── Section 12: 前端类比速查 ───────────────────────────────────────────────

  const feRows = [
    ['数据库 / SQLite',       'Index',                  '数据存储单位'],
    ['表',                     'Type（已废弃）→ 文档类型', '历史概念'],
    ['行数据',                 'Document (JSON)',        '一条记录'],
    ['表结构 Schema',          'Mapping',                '字段类型定义'],
    ['LIKE %xx%',             'match query',            '关键词检索'],
    ['WHERE = xxx',           'term / filter',          '精确匹配'],
    ['GROUP BY + COUNT',      'aggs (聚合)',            '分组统计'],
    ['Algolia / Meilisearch', 'ES 本体',                '专业搜索引擎'],
    ['Kibana',                'Grafana / Metabase',     '数据可视化'],
    ['分表分库',               'Shard + Replica',        '水平扩展 + 高可用'],
  ];
  const feTable = compareCard(feRows, ['前端/MySQL 类比', 'ES 概念', '本质']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('为什么需要 ES（对比 MySQL）', whyTable)}
    ${section('核心概念（对比 MySQL）', conceptBox + conceptTable)}
    ${section('倒排索引（核心原理）', invertBox + codeBlock('倒排索引构建过程', 'dot-orange', 'text', invertCode))}
    ${section('REST API（一切皆 HTTP）', apiBox + codeBlock('索引与文档 CRUD', 'dot-blue', 'bash', apiCode))}
    ${section('查询 DSL（ES 的 SQL）', dslBox + codeBlock('Query DSL 示例', 'dot-green', 'bash', dslCode))}
    ${section('Spring Boot 整合', codeBlock('ES 8 + Spring Boot 3 整合', 'dot-green', 'java', springCode))}
    ${section('中文分词（IK 分词器）', ikBox + codeBlock('IK 分词器配置', 'dot-orange', 'bash', ikCode))}
    ${section('集群与分片', codeBlock('集群拓扑与分片', 'dot-blue', 'text', clusterCode))}
    ${section('ELK 技术栈', elkTable + codeBlock('经典 ELK 日志架构', 'dot-orange', 'bash', elkFlow))}
    ${section('何时该用 / 不该用 ES', useCaseTable)}
    ${section('性能优化要点', perfTable)}
    ${section('前端类比速查', feTable)}`);
}
