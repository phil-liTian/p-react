function renderDoris(t) {
  const conclusion = ruleBox('accent',
    `<strong>Apache Doris = MPP 分析型数据库，专为实时 OLAP 场景设计。</strong><br><br>
    它解决的核心问题：<strong>"MySQL/PostgreSQL 扛不住海量数据的实时分析"</strong>。<br>
    • <strong>慢</strong>：MySQL 在亿级数据上做 <code>GROUP BY / COUNT / SUM</code> 需要 10s+，Doris 亚秒级返回<br>
    • <strong>写不动</strong>：传统数仓（Hive）T+1 才能看数据，Doris 秒级实时写入<br>
    • <strong>并发低</strong>：MySQL 单机扛不住几百个并发分析查询<br><br>
    Doris 由百度开源（原名 Palo），2018 年进入 Apache 孵化器，目前是顶级项目。<br>
    国内大厂在用：百度、美团、京东、小米、知乎、字节……<br><br>
    前端类比：Doris ≈ 后端版的 <code>Google BigQuery</code> / <code>ClickHouse</code>——专门的 OLAP 引擎，写 SQL 就能分析海量数据。`);

  // ── Section 1: 为什么需要 Doris（OLTP vs OLAP）────────────────────────────────

  const whyRows = [
    ['日常业务写入/查询',   '✅ OLTP（MySQL）',  '❌ 不擅长',      '订单/账户等事务场景'],
    ['亿级数据 GROUP BY',   '10s+，可能挂掉',     '亚秒级',         'Doris 是为这种场景生的'],
    ['实时写入 + 即时查询',  '写入慢、查询慢',     '秒级可见',        'Stream Load 实时导入'],
    ['高并发查询',          '几百 QPS 就卡',      '数千 QPS',       'MPP + 向量化执行'],
    ['JOIN 多张大表',       '难',                 '✅ Colocate Join', 'Doris 优化器自动选择'],
    ['物化视图自动改写',     '❌ 不支持',          '✅ 自动路由',     '查询命中物化视图，加速 10x'],
    ['数据量',              'TB 级已吃力',        'PB 级',          '分布式存储 + 计算'],
    ['运维复杂度',          '低（成熟）',         '中',             'FE/BE 两类节点'],
    ['SQL 协议',            'MySQL 协议',         'MySQL 协议',     '直接用 MySQL 客户端连'],
  ];
  const whyTable = compareCard(whyRows, ['场景', 'MySQL（OLTP）', 'Doris（OLAP）', '说明']);

  // ── Section 2: 核心概念（对比 MySQL）──────────────────────────────────────────

  const conceptBox = ruleBox('info',
    `<strong>理解 Doris 最好从 MySQL 概念迁移：</strong>Doris 完全兼容 MySQL 协议，前端用 MySQL 客户端直连就能写 SQL。`);

  const conceptRows = [
    ['FE',                  'Frontend 节点',    'MySQL Server',   '接收 SQL、解析、生成执行计划、元数据管理'],
    ['BE',                  'Backend 节点',     '存储引擎',        '存储数据、执行 MPP 计算、返回结果'],
    ['Catalog',             '目录',             'Database',       '内部 / 外部数据源（如 Hive、Iceberg）'],
    ['Database',            '数据库',           'Schema',         '同一数据库下的表共享命名空间'],
    ['Table',               '表',               'Table',          '分为明细 / 聚合 / 唯一 / 主键四种模型'],
    ['Partition',           '分区',             '分区表',         '按时间/范围切分大表，便于管理'],
    ['Tablet',              '分片',             'Shard',          '数据最小存储单元，多副本（默认 3）'],
    ['Materialized View',   '物化视图',         '汇总表',         '预计算结果，查询自动改写命中'],
    ['Rollup',              '上卷',             '—',              '物化视图的旧称，新版统一为 MV'],
  ];
  const conceptTable = compareCard(conceptRows, ['Doris 术语', '中文', 'MySQL 对应', '说明']);

  // ── Section 3: 架构（FE + BE）───────────────────────────────────────────────

  const archBox = ruleBox('warning',
    `<strong>Doris 架构极简：只有两类节点 FE 和 BE，存算耦合（不像 TiDB 那样存算分离）。</strong><br>
    好处：部署简单、延迟低。代价：扩容时存算一起扩。<br>
    前端类比：FE ≈ API 网关 + 元数据库，BE ≈ 工作节点 + 存储节点。`);

  const archCode = `# 集群拓扑示例
Cluster: my-doris
├── FE（Frontend）×3            # 奇数个，选主 + 高可用
│     ├── Leader FE             # 主节点，写元数据
│     ├── Follower FE ×2        # 跟随者，可读
│     └── Observer FE（可选）   # 只读，扩展查询并发
│
└── BE（Backend）×N             # 数据节点
      ├── Tablet 1 (replica 1)  # 数据分片，3 副本
      ├── Tablet 1 (replica 2)
      ├── Tablet 1 (replica 3)
      └── Tablet 2 (replica 1/2/3)...

# 关键流程
# ① 客户端连任意 FE，发送 SQL
# ② FE 解析 SQL → 优化器 → 生成物理执行计划（DAG）
# ③ FE 把执行计划下发给 BE，BE 之间 MPP 协同计算（shuffle / broadcast）
# ④ BE 把结果汇总到 FE，FE 返回给客户端

# 写入路径
# Stream Load：HTTP PUT 直接打到 BE，BE 写 Tablet
# Broker Load：FE 调度，从 HDFS/S3 拉数据分发给 BE
# Routine Load：常驻任务消费 Kafka，自动写入`;

  // ── Section 4: 四种表模型 ─────────────────────────────────────────────────────

  const modelBox = ruleBox('info',
    `<strong>建表第一步：选择表模型。模型决定了数据如何存储、查询、去重。</strong><br>
    Doris 提供 4 种模型，对应不同业务场景。`);

  const modelRows = [
    ['Duplicate',   '明细模型',   '保留所有数据',           '日志、明细事件流',         '不去重，所有写入都保留'],
    ['Aggregate',   '聚合模型',   '按 Key 自动聚合',        'PV/UV、指标统计',          '同 Key 新值按聚合函数（SUM/MAX/REPLACE）合并'],
    ['Unique',      '唯一模型',   '按 Key 替换',            '订单状态更新、用户信息变更', '旧版基于 REPLACE 聚合，新版推荐用 Merge-on-Write'],
    ['Primary Key', '主键模型',   '按主键替换（推荐）',      '高频更新的业务表',         'Merge-on-Write，查询性能接近明细模型'],
  ];
  const modelTable = compareCard(modelRows, ['模型', '中文名', '行为', '典型场景', '说明']);

  const modelCode = `-- 1. 明细模型（Duplicate）：日志、事件流
CREATE TABLE event_log (
  event_id    BIGINT,
  user_id     BIGINT,
  event_type  VARCHAR(32),
  event_time  DATETIME,
  properties  JSON
)
DUPLICATE KEY(event_id, event_time)   -- 仅用于排序，不去重
PARTITION BY RANGE(event_time) ()     -- 动态分区
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES("replication_num" = "3");

-- 2. 聚合模型（Aggregate）：PV/UV、指标
CREATE TABLE user_pv (
  dt          DATE,
  app_id      VARCHAR(32),
  user_id     BIGINT,
  pv          BIGINT SUM,             -- 同 Key 的 pv 累加
  last_login  DATETIME MAX            -- 取最新
)
AGGREGATE KEY(dt, app_id, user_id)
DISTRIBUTED BY HASH(user_id) BUCKETS 10;

-- 3. 主键模型（Primary Key）：高频更新场景，推荐
CREATE TABLE orders (
  order_id    BIGINT,
  user_id     BIGINT,
  status      VARCHAR(16),
  amount      DECIMAL(10,2),
  update_time DATETIME
)
PRIMARY KEY(order_id)                 -- 主键去重，新值覆盖旧值
DISTRIBUTED BY HASH(order_id) BUCKETS 10
PROPERTIES("enable_unique_key_merge_on_write" = "true");  -- MoW 模式`;

  // ── Section 5: 数据导入 ──────────────────────────────────────────────────────

  const loadBox = ruleBox('success',
    `<strong>Doris 的导入方式覆盖所有场景，从实时秒级到批量小时级都有。</strong><br>
    核心原则：<strong>导入是原子的</strong>——要么全部成功，要么全部失败，不会出现半导入状态。`);

  const loadRows = [
    ['Stream Load',           'HTTP PUT',         '实时（秒级）',  '日志、埋点',       '直接 PUT 到 BE，最常用'],
    ['Routine Load',          '常驻消费 Kafka',   '实时（流式）',  'Kafka 数据',       '自动消费 + 自动重试'],
    ['Broker Load',           'HDFS / S3 拉取',   '分钟 ~ 小时',   '大批量离线导入',   'FE 调度，BE 并行拉取'],
    ['Insert Into',           'SQL INSERT',       '实时',          '小量数据 / 中间结果', '性能差，不建议大数据量'],
    ['S3 Load',               '从 S3 直接拉',     '分钟',          '云上数据湖',       'Broker Load 的 S3 特化版'],
    ['Flink Doris Connector', 'Flink sink',       '实时（流式）',  'Flink 实时数仓',   '官方推荐流式方案'],
  ];
  const loadTable = compareCard(loadRows, ['方式', '协议', '延迟', '典型场景', '说明']);

  const loadCode = `# 1. Stream Load：HTTP PUT 直接打 BE（最常用）
curl -X PUT "http://be-host:8040/api/db/event_log/_stream_load" \\
  -H "Expect: 100-continue" \\
  -H "label:load_20260714_001" \\       # 必传，幂等性保证（同 label 重试不会重复）
  -H "column_separator:," \\
  -H "columns:event_id,user_id,event_type,event_time" \\
  -T data.csv

# 返回 JSON：
# { "Status": "Success", "NumberLoadedRows": 10000, "LoadBytes": 524288 }

# 2. Routine Load：常驻消费 Kafka
CREATE ROUTINE LOAD kafka_event_load ON event_log
COLUMNS(event_id, user_id, event_type, event_time),
COLUMNS TERMINATED BY ",",
PROPERTIES(
  "desired_concurrent_tasks" = "3",
  "max_error_number" = "1000"
)
FROM KAFKA(
  "kafka_broker_list" = "kafka-1:9092,kafka-2:9092",
  "kafka_topic" = "events",
  "property.group.id" = "doris_event_consumer"
);

# 3. Broker Load：从 HDFS 批量导入
LOAD LABEL db.hdfs_load_20260714 (
  DATA INFILE("hdfs://namenode:8020/data/orders/*")
  INTO TABLE orders
  COLUMNS TERMINATED BY ","
  (order_id, user_id, amount, create_time)
)
WITH BROKER "hdfs_broker" (
  "username" = "hdfs",
  "password" = ""
);

# 4. Flink 实时写入（流式数仓标配）
# Flink SQL
INSERT INTO doris_orders
SELECT * FROM kafka_orders;`;

  // ── Section 6: 查询优化（物化视图、Colocate Join）────────────────────────────

  const optimizeBox = ruleBox('warning',
    `<strong>Doris 性能优化的两大杀手锏：物化视图（自动改写）和 Colocate Join（同分布 JOIN）。</strong><br>
    前端类比：物化视图 ≈ Next.js 的 ISR（预渲染），查询时自动命中预计算结果。`);

  const optimizeCode = `-- 1. 物化视图：预聚合，查询自动改写
-- 场景：原始表按 user_id 明细存储，但报表经常按天 + app 汇总
CREATE MATERIALIZED VIEW mv_daily_pv AS
SELECT
  dt, app_id,
  COUNT(DISTINCT user_id) AS uv,
  COUNT(*) AS pv
FROM user_event
GROUP BY dt, app_id;

-- 之后用户查询：
SELECT dt, app_id, COUNT(*) FROM user_event GROUP BY dt, app_id;
-- Doris 优化器自动改写，直接查 mv_daily_pv，速度提升 10~100 倍

-- 2. Colocate Join：相同分布的表 JOIN 不走网络 shuffle
-- 场景：user_event 和 user_info 都按 user_id 分桶
CREATE TABLE user_event (...)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES("colocate_with" = "user_group");   -- 同组

CREATE TABLE user_info (...)
DISTRIBUTED BY HASH(user_id) BUCKETS 10
PROPERTIES("colocate_with" = "user_group");

-- JOIN 时自动识别为 Colocate Join，省去 shuffle 阶段，性能提升数倍
SELECT /*+ SET_VAR(parallel_fragment_exec_instance_num=8) */
  e.dt, COUNT(*)
FROM user_event e JOIN user_info i ON e.user_id = i.user_id
WHERE i.city = '北京'
GROUP BY e.dt;

-- 3. 动态分区：自动创建未来分区、删除历史分区
ALTER TABLE event_log SET (
  "dynamic_partition.enable" = "true",
  "dynamic_partition.time_unit" = "DAY",
  "dynamic_partition.start" = "-30",      -- 保留 30 天
  "dynamic_partition.end"   = "3",        -- 预创建未来 3 天
  "dynamic_partition.prefix" = "p",
  "dynamic_partition.buckets" = "10"
);`;

  // ── Section 7: Spring Boot 整合（MySQL 协议直连）─────────────────────────────

  const springPom = `<!-- 1. 引入 MySQL JDBC 驱动（Doris 兼容 MySQL 协议） -->
<dependency>
  <groupId>mysql</groupId>
  <artifactId>mysql-connector-java</artifactId>
  <version>8.0.33</version>
</dependency>

<!-- 2. 用 MyBatis-Plus 也行，配置完全一样 -->
<dependency>
  <groupId>com.baomidou</groupId>
  <artifactId>mybatis-plus-boot-starter</artifactId>
  <version>3.5.5</version>
</dependency>`;

  const springYml = `# application.yml
spring:
  datasource:
    # Doris FE 的查询端口（默认 9030，MySQL 协议）
    url: jdbc:mysql://doris-fe-host:9030/analytics_db?useUnicode=true&characterEncoding=utf8
    username: root
    password: ""              # Doris 默认无密码，生产环境要加
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 10   # Doris 支持高并发，但每个连接占资源，别设太大`;

  const springJava = `// 3. 直接用 MyBatis-Plus 写 SQL，跟操作 MySQL 一模一样
@Data
@TableName("user_pv")
public class UserPv {
  private LocalDate dt;
  private String appId;
  private Long userId;
  private Long pv;
  private LocalDateTime lastLogin;
}

@Mapper
public interface UserPvMapper extends BaseMapper<UserPv> {

  // 复杂分析查询直接写 SQL（Doris 擅长的场景）
  @Select("""
      SELECT dt, app_id, SUM(pv) AS total_pv, COUNT(DISTINCT user_id) AS uv
      FROM user_pv
      WHERE dt BETWEEN #{start} AND #{end}
      GROUP BY dt, app_id
      ORDER BY dt DESC
      """)
  List<DailyStat> dailyStats(@Param("start") LocalDate start,
                              @Param("end") LocalDate end);
}

// 4. Controller 暴露 API
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analytics")
public class AnalyticsController {

  private final UserPvMapper userPvMapper;

  @GetMapping("/daily")
  public List<DailyStat> daily(@RequestParam LocalDate start,
                                @RequestParam LocalDate end) {
    return userPvMapper.dailyStats(start, end);
  }
}`;

  // ── Section 8: 对比 ClickHouse / Elasticsearch ───────────────────────────────

  const compareRows = [
    ['SQL 协议',           'MySQL',               '自定义方言',          'REST + JSON'],
    ['运维复杂度',         '低（FE+BE 两类节点）', '中（ZooKeeper / 副本）', '高（集群 + 分片 + 副本）'],
    ['实时写入',           '✅ Stream Load 简单', '⚠️ 频繁小写入有问题', '⚠️ refresh 1s 延迟'],
    ['JOIN 能力',          '✅ 强（Colocate）',    '❌ 弱（需大宽表）',    '❌ 弱（不擅长 JOIN）'],
    ['物化视图自动改写',   '✅ 支持',              '✅ 支持',              '⚠️ 有限'],
    ['高并发查询',         '✅ 数千 QPS',          '⚠️ 单查询占资源',     '✅ 好'],
    ['中文全文检索',       '❌ 不擅长',            '⚠️ 有限',             '✅ 强（IK 分词器）'],
    ['日志检索场景',       '✅ 日志分析可用',      '✅ 强',               '✅ 强（ELK）'],
    ['实时数仓场景',       '✅ 标配',              '✅ 标配',             '❌ 不是为分析设计'],
    ['国内生态',           '✅ 百度/美团/京东',    '✅ 字节/腾讯',        '✅ ELK 通用'],
    ['学习曲线',           '低（SQL 友好）',       '中（语法特殊）',      '高（DSL + 调优）'],
  ];
  const compareTable = compareCard(compareRows, ['维度', 'Doris', 'ClickHouse', 'Elasticsearch']);

  // ── Section 9: 典型使用场景 ──────────────────────────────────────────────────

  const useCaseRows = [
    ['实时数仓',                  '✅ 强烈推荐',   'Flink + Doris 是国内主流方案'],
    ['用户行为分析（漏斗、留存）', '✅ 强烈推荐',   'Bitmap UDF 支持秒级 UV 计算'],
    ['实时报表 / 大屏',           '✅ 强烈推荐',   '亚秒级查询，支撑高管大屏'],
    ['日志分析',                  '✅ 可用',        '不如 ES 灵活，但成本更低'],
    ['广告 / 推荐实时统计',       '✅ 强烈推荐',   '高并发 + 实时写入场景'],
    ['交易事务（OLTP）',          '❌ 不推荐',     'Doris 不支持事务，用 MySQL'],
    ['全文检索 / 搜索引擎',       '❌ 不推荐',     '用 Elasticsearch'],
    ['图数据库场景',              '❌ 不推荐',     '用 Neo4j / Nebula'],
    ['简单 KV 缓存',              '❌ 不推荐',     '用 Redis'],
  ];
  const useCaseTable = compareCard(useCaseRows, ['场景', '推荐度', '原因']);

  // ── Section 10: 前端类比速查 ─────────────────────────────────────────────────

  const feRows = [
    ['MySQL',                'Doris',                '两者 SQL 协议兼容'],
    ['API 网关',             'FE（Frontend）',       '接收请求、路由、元数据'],
    ['工作节点 / 微服务',    'BE（Backend）',        '实际干活、存数据'],
    ['分表分库',             'Partition + Tablet',   '水平拆分'],
    ['主从复制',             '多副本（默认 3）',     '高可用'],
    ['Redis 缓存',           '物化视图',             '预计算加速查询'],
    ['GraphQL DataLoader',   'Colocate Join',        '避免 N+1 / 网络开销'],
    ['BigQuery / Snowflake', 'Doris',                '云上 OLAP 数据库'],
    ['PostgreSQL 物化视图',  'Doris 物化视图',       '两者机制类似，Doris 自动改写'],
  ];
  const feTable = compareCard(feRows, ['前端/MySQL 类比', 'Doris 概念', '本质']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('为什么需要 Doris（OLTP vs OLAP）', whyTable)}
    ${section('核心概念（对比 MySQL）', conceptBox + conceptTable)}
    ${section('架构（FE + BE）', archBox + codeBlock('Doris 集群拓扑', 'dot-blue', 'text', archCode))}
    ${section('四种表模型', modelBox + modelTable + codeBlock('建表示例', 'dot-orange', 'sql', modelCode))}
    ${section('数据导入', loadBox + loadTable + codeBlock('Stream Load / Routine Load / Broker Load', 'dot-green', 'bash', loadCode))}
    ${section('查询优化（物化视图 / Colocate Join）', optimizeBox + codeBlock('优化示例', 'dot-orange', 'sql', optimizeCode))}
    ${section('Spring Boot 整合（MySQL 协议直连）', codeBlock('pom.xml', 'dot-blue', 'xml', springPom) + codeBlock('application.yml', 'dot-blue', 'yaml', springYml) + codeBlock('MyBatis-Plus 示例', 'dot-green', 'java', springJava))}
    ${section('对比 ClickHouse / Elasticsearch', compareTable)}
    ${section('典型使用场景', useCaseTable)}
    ${section('前端类比速查', feTable)}`);
}
