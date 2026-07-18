function renderPostgresqlOverview(t) {
  const conclusion = ruleBox('info',
    `PostgreSQL 是最先进的<strong>开源对象-关系型数据库</strong>，以"高 SQL 标准兼容 + 可扩展 + 稳定"著称。凭借 <strong>MVCC 多版本并发控制</strong>实现无锁读、丰富的数据类型（JSONB、数组、范围、几何）、强大的扩展生态（PostGIS、pg_vector、TimescaleDB），PostgreSQL 在<strong>复杂查询、地理空间、AI 向量检索、高并发写入</strong>等场景中表现卓越——如果你需要"一个数据库打天下"，PostgreSQL 是当下最被低估又最值得押注的选择。`);

  const scenariosHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">📊</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">复杂分析 / OLAP</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          窗口函数、CTE 递归、物化视图、并行查询——PostgreSQL 的 SQL 表达力远超 MySQL。一份报表查询用 MySQL 要写存储过程，用 PostgreSQL 一条 SQL 搞定。<strong style="color:var(--text-primary)">HTAP 场景</strong>（同时 OLTP + OLAP）下尤其香。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🌍</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">地理空间 / PostGIS</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          打车、外卖、共享单车——所有<strong style="color:var(--text-primary)">"附近的人"</strong>类查询都靠 PostGIS 扩展。GiST 索引支撑的 KNN 查询毫秒级返回"方圆 5km 内的司机"，是 MySQL spatial index 望尘莫及的能力。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🤖</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">AI 向量检索 / RAG</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <code>pg_vector</code> 扩展让 PostgreSQL 直接存储与检索 embedding 向量。中小规模 RAG 系统无需引入 Milvus / Pinecone，<strong style="color:var(--text-primary)">业务数据 + 向量数据同库</strong>，事务一致、运维简单。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">⚡</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">高并发写入 / SaaS</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          MVCC 让<strong style="color:var(--text-primary)">读不阻塞写、写不阻塞读</strong>，多租户 SaaS、IoT 时序写入、游戏服数据这类高并发场景吞吐稳定。配合行级锁 + 悲观/乐观控制，比 MySQL 的间隙锁更少死锁。
        </div>
      </div>
    </div>`;

  const stackRows = [
    ['对象-关系型（ORDBMS）',        '关系型（RDBMS）',              'PostgreSQL 支持自定义类型、操作符、继承；MySQL 更纯粹的关系模型'],
    ['SQL 标准高度兼容',             'SQL 标准部分兼容',             'PostgreSQL 的 CTE、窗口函数、CHECK 约束更完整；MySQL 多有简化'],
    ['MVCC（多版本并发控制）',        'InnoDB MVCC + 间隙锁',         'PostgreSQL 无间隙锁，写不阻塞读更彻底；死锁概率更低'],
    ['JSONB（二进制 JSON）',          'JSON 列',                      'JSONB 支持 GIN 索引，可高效查询嵌套字段；MySQL JSON 索引能力弱'],
    ['Process-per-connection',       'Thread-per-connection',        'PostgreSQL 每连接一个进程，连接池（PgBouncer）是标配；MySQL 用线程更轻'],
    ['扩展生态（PostGIS/pg_vector）', '插件生态较弱',                 'PostgreSQL 可扩展到向量、时序、图数据库；MySQL 主要靠存储引擎'],
    ['流复制 + 逻辑复制',            'binlog 主从复制',              'PostgreSQL 物理复制 + 逻辑订阅双轨；MySQL 主从 + 半同步'],
    ['序列 + 自增 IDENTITY',         'AUTO_INCREMENT',               'PostgreSQL 用 SEQUENCE 灵活可控；MySQL 自增列绑定到表'],
  ];

  const stackTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">PostgreSQL 概念</div>
        <div class="compare-card-header-cell frontend">MySQL 对应</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${stackRows.map(([db, fe, desc]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${db}</div>
        <div class="compare-card-cell frontend">${fe}</div>
        <div class="compare-card-cell desc">${desc}</div>
      </div>`).join('')}
    </div>`;

  const mvccBox = ruleBox('success',
    `<strong>MVCC 多版本并发控制</strong>：每条数据保留多个历史版本，<strong>读操作看到事务开始时的快照</strong>，与并发写互不阻塞。PostgreSQL 的 MVCC 比 MySQL 更彻底——<strong>没有间隙锁</strong>，范围查询不会锁住尚未插入的行，高并发插入下死锁极少。代价是 <code>VACUUM</code> 清理旧版本——这就是 PostgreSQL 必须配置 autovacuum 的原因。这套"快照隔离 + 后台清理"的思想与<strong>Git 的不可变历史</strong>异曲同工。`);

  const extBox = ruleBox('info',
    `<strong>扩展（Extension）生态</strong>：PostgreSQL 的杀手锏。安装一个扩展即可获得新能力：<code>PostGIS</code>（地理空间）、<code>pg_vector</code>（AI 向量）、<code>TimescaleDB</code>（时序）、<code>pg_trgm</code>（模糊搜索）、<code>uuid-ossp</code>（UUID 生成）。一个数据库即可覆盖关系、文档、向量、时序、地理多种场景——这就是"<strong>对象-关系型</strong>"的真正含义：你可以定义类型、操作符、索引方法，把数据库塑造成你需要的形状。`);

  const jsonbSql = `-- JSONB：比 MySQL JSON 更强的文档能力
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT,
  attrs JSONB                    -- 二进制 JSON，支持索引
);

-- 插入：直接存 JSON
INSERT INTO products (name, attrs) VALUES
  ('MacBook', '{"cpu":"M3","ram":16,"tags":["laptop","apple"]}');

-- GIN 索引：加速嵌套字段查询
CREATE INDEX idx_attrs ON products USING GIN (attrs);

-- 查询：->> 取文本，-> 取 JSON，@> 包含匹配
SELECT name FROM products
WHERE attrs @> '{"tags":["apple"]}'      -- 包含 apple 标签
  AND attrs ->> 'cpu' = 'M3';            -- 等值匹配

-- 窗口函数 + CTE：复杂报表一条 SQL 搞定
WITH ranked AS (
  SELECT name, attrs ->> 'cpu' AS cpu,
         ROW_NUMBER() OVER (PARTITION BY attrs ->> 'cpu' ORDER BY id) AS rn
  FROM products
)
SELECT * FROM ranked WHERE rn <= 3;`;

  const replSql = `# 流复制（物理复制）：块级同步，主备完全一致
# postgresql.conf（主）
wal_level = replica
max_wal_senders = 10
synchronous_commit = on                # 同步提交，保证不丢
synchronous_standby_names = 'standby1' # 同步备库名

# 逻辑复制（订阅特定表）：跨版本、跨平台
# 发布端（Publisher）
CREATE PUBLICATION pub_orders FOR TABLE orders;

# 订阅端（Subscriber）
CREATE SUBSCRIPTION sub_orders
  CONNECTION 'host=primary port=5432'
  PUBLICATION pub_orders;

# 逻辑复制常用于：读写分离、跨大版本升级、部分表同步到数据仓库`;

  const notForHtml = `
    <p>PostgreSQL 不擅长或需要谨慎使用的场景：</p>
    <ul>
      <li><strong>超高 QPS 简单 KV 读取</strong>：进程模型开销大，每连接几十 MB 内存，无连接池时单机撑不过几千连接——这种场景仍应靠 Redis 挡在前面</li>
      <li><strong>写入吞吐极致场景</strong>：MVCC 的旧版本需 VACUUM 清理，写入极频繁时若 autovacuum 配置不当会膨胀；时序海量写入可考虑 TimescaleDB 扩展</li>
      <li><strong>跨地域强一致多活</strong>：原生流复制是单主模型，多活需借助 CockroachDB / YugabyteDB 这类 NewSQL，或 PostgreSQL 的 BDR 插件</li>
      <li><strong>对运维成熟度要求极高</strong>：国内 MySQL DBA 池子远大于 PostgreSQL，团队若无 PG 经验，故障响应、性能调优门槛更高</li>
      <li><strong>嵌入式 / 单机轻量场景</strong>：比 SQLite 重得多，App 内嵌或单机工具用 SQLite 更合适</li>
    </ul>`;

  return articleShell(t, `
    ${section('PostgreSQL 是什么', conclusion)}
    ${section('主要应用场景', scenariosHtml)}
    ${section('PostgreSQL vs MySQL / 前端存储', stackTable)}
    ${section('核心概念：MVCC 多版本并发控制', mvccBox)}
    ${section('核心概念：扩展生态（对象-关系型）', extBox)}
    ${section('SQL 实战：JSONB + 窗口函数 + CTE', codeBlock('PostgreSQL · JSONB 与高级 SQL', 'dot-blue', 'sql', jsonbSql))}
    ${section('复制：流复制 + 逻辑复制', codeBlock('PostgreSQL · 物理与逻辑复制', 'dot-orange', 'ini', replSql))}
    ${section('PostgreSQL 不擅长的领域', `<div class="section-body">${notForHtml}</div>`)}`);
}
