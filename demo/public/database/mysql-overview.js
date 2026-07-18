function renderMysqlOverview(t) {
  const conclusion = ruleBox('accent',
    `MySQL 是最流行的<strong>开源关系型数据库</strong>，以"表结构 + SQL + ACID 事务"为核心模型。凭借<strong>InnoDB 存储引擎</strong>的 B+ 树索引与行级锁、成熟的主从复制生态，MySQL 是互联网 <strong>OLTP（联机事务处理）</strong>场景的事实标准——你日常用的电商订单、社交账户、支付流水，背后大概率跑着 MySQL。`);

  const scenariosHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🛒</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">电商 / 交易系统</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          订单、库存、支付、优惠券是典型的<strong style="color:var(--text-primary)">强一致性事务</strong>场景：扣库存 + 写订单 + 记流水必须原子完成。InnoDB 的 ACID 事务 + 行级锁 + 4 种隔离级别天然契合这类需求。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">👤</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">用户中心 / 账户体系</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          用户表、角色权限、登录日志、关系链——结构稳定、查询模式相对固定，关系模型的表达力最强。通过外键、唯一索引、联合索引可以覆盖绝大多数账户类查询。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🏦</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">金融 / 账务系统</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          银行核心账务、第三方支付流水对<strong style="color:var(--text-primary)">数据零丢失</strong>有硬性要求。MySQL 通过 <code>innodb_flush_log_at_trx_commit=1</code> + 双 1 刷盘 + binlog 复制保证事务不丢，配合 <code>XA</code> / Saga 实现跨库分布式事务。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">📝</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">内容管理 / SaaS 业务</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          CMS、ERP、CRM、工单系统——表与表之间关联明确（文章↔分类↔标签↔作者），SQL 的 JOIN、子查询、聚合函数能直接表达这类多表关系，无需应用层手动拼装。
        </div>
      </div>
    </div>`;

  const stackRows = [
    ['表 / 行 / 列',              'JSON 对象 / Document',        'MySQL 强制 schema，写入前必须建表；MongoDB / 前端 localStorage 灵活'],
    ['SQL（DDL + DML）',          'JS API / Mongo Shell',         'SQL 是声明式查询语言，专注"要什么"而非"怎么取"'],
    ['InnoDB B+ 树索引',          'IndexedDB 索引 / 内存 Map',    'B+ 树对范围查询友好；前端存储数据量小，索引价值有限'],
    ['ACID 事务',                 '无（前端）/ MongoDB 4.0+',     '事务保证多条操作要么全成功要么全回滚'],
    ['主从复制 + 读写分离',       '—（前端无对应概念）',          '一主多从架构支撑读扩展与高可用'],
    ['连接池（HikariCP）',        '连接复用 / Pool',              '建立 TCP + 鉴权成本高，池化是标配'],
    ['慢查询日志 + EXPLAIN',      'Chrome DevTools Performance',  '定位性能瓶颈的核心工具'],
  ];

  const stackTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">MySQL 概念</div>
        <div class="compare-card-header-cell frontend">前端 / NoSQL 对应</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${stackRows.map(([db, fe, desc]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${db}</div>
        <div class="compare-card-cell frontend">${fe}</div>
        <div class="compare-card-cell desc">${desc}</div>
      </div>`).join('')}
    </div>`;

  const acidBox = ruleBox('success',
    `<strong>ACID 四特性</strong>：<code>Atomicity</code> 原子性（事务要么全做要么全不做，靠 undo log 回滚） · <code>Consistency</code> 一致性（数据约束不被破坏） · <code>Isolation</code> 隔离性（4 级隔离：读未提交 / 读已提交 / 可重复读 / 串行化，InnoDB 默认"可重复读"并用 MVCC + 间隙锁解决幻读） · <code>Durability</code> 持久性（redolog 刷盘后即使宕机也不丢）。`);

  const innodbBox = ruleBox('info',
    `<strong>InnoDB 存储引擎</strong>：MySQL 5.5 起的默认引擎，<strong>聚簇索引</strong>——数据和主键索引存同一棵 B+ 树，按主键查询直接命中数据；<strong>二级索引</strong>存的是主键值，需要"回表"再查一次。这解释了为什么 MySQL 强烈建议主键用自增 ID（顺序插入、页分裂少）以及为什么 <code>SELECT *</code> 在二级索引下代价高。`);

  const indexSql = `-- 创建联合索引（最左匹配原则）
CREATE INDEX idx_user_status ON orders(user_id, status, created_at);

-- 命中索引：user_id → status → created_at 范围
SELECT * FROM orders
WHERE user_id = 1001 AND status = 'PAID' AND created_at > '2026-01-01';

-- 用 EXPLAIN 验证是否走索引（看 key、rows、Extra）
EXPLAIN SELECT * FROM orders WHERE user_id = 1001;`;

  const replSql = `-- 主库（Master）：写 binlog，从库拉取重放
[mysqld]
log-bin=mysql-bin
server-id=1
binlog-format=ROW          -- 行级复制，最安全

-- 从库（Slave）：IO 线程拉 binlog，SQL 线程重放
[mysqld]
server-id=2
relay-log=relay-bin
read-only=1                -- 从库只读，避免主从不一致`;

  const notForHtml = `
    <p>MySQL 不擅长或需要配合其他组件的场景：</p>
    <ul>
      <li><strong>海量日志 / 时序数据</strong>：写入量极大、按时间聚合查询，更适合 ClickHouse、Doris、InfluxDB 这类列式 OLAP 引擎</li>
      <li><strong>文档型 / Schema 不固定数据</strong>：字段频繁变化、嵌套层级深，MongoDB 更顺手（虽然 MySQL 8 也支持 JSON 列）</li>
      <li><strong>超高并发 KV 读取</strong>：热点 key QPS 10w+，Redis 内存数据库更合适，MySQL 通常配合 Redis 做缓存</li>
      <li><strong>全文检索 / 复杂搜索</strong>：MySQL 的 FULLTEXT 索引功能有限，复杂分词、相关性排序应交给 Elasticsearch</li>
      <li><strong>跨地域强一致写入</strong>：单机 MySQL 故障即停服，跨地域多活需要 Spanner / TiDB / OceanBase 这类分布式数据库</li>
    </ul>`;

  return articleShell(t, `
    ${section('MySQL 是什么', conclusion)}
    ${section('主要应用场景', scenariosHtml)}
    ${section('MySQL vs 前端 / NoSQL 存储', stackTable)}
    ${section('核心概念：ACID 事务', acidBox)}
    ${section('核心概念：InnoDB 与 B+ 树', innodbBox)}
    ${section('索引实战：最左匹配 + EXPLAIN', codeBlock('SQL · 联合索引与执行计划', 'dot-blue', 'sql', indexSql))}
    ${section('主从复制：高可用与读写分离', codeBlock('MySQL · 主从配置片段', 'dot-orange', 'ini', replSql))}
    ${section('MySQL 不擅长的领域', `<div class="section-body">${notForHtml}</div>`)}`);
}
