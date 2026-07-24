function renderPgConcepts(t) {
  const conclusion = ruleBox('info',
    `PostgreSQL 的设计哲学是<strong>"正确性优先 + 可扩展"</strong>——严格遵循 SQL 标准、用 MVCC 替代锁实现并发、用进程而非线程隔离连接、用扩展机制把数据库塑造成任何形状。这套设计让 PostgreSQL 在<strong>数据正确性、复杂查询、扩展能力</strong>上远超 MySQL，代价是<strong>连接数敏感、VACUUM 运维成本</strong>。理解这些核心概念，是真正掌握 PostgreSQL 的前提。`);

  const mvccHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">MVCC 工作原理</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>-- 每行记录有两个隐藏字段：
--   xmin ：插入/更新该行的事务 ID
--   xmax ：删除/更新该行的事务 ID（0 表示未删除）

-- UPDATE 在 PostgreSQL 中 = DELETE + INSERT
--   旧行 xmax 标记为当前事务 ID（不立即删除）
--   新行插入，xmin = 当前事务 ID

-- 事务开始时生成快照（Snapshot）：
--   记录当前活跃事务列表
--   判断行的可见性：
--     xmin 已提交且 &lt; 快照 → 可见
--     xmin 在快照时还活跃 → 不可见
--     xmax 已提交且 &lt; 快照 → 已删除，不可见
--     xmax 未提交或 &gt; 快照 → 仍可见

-- 这套机制下：
--   • 读操作不需要加锁，看到的是事务开始时的快照
--   • 写操作不阻塞读，读不阻塞写
--   • UPDATE/DELETE 产生"死元组"（dead tuple），需 VACUUM 清理</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">MVCC vs MySQL InnoDB 的差异</strong>：① PG 没有"回滚段"——回滚靠标记 xmax，旧版本留在表中等 VACUUM；InnoDB 有专门 undo tablespace。② PG 没有"间隙锁"——范围查询不锁未插入的行，高并发插入更友好；InnoDB RR 隔离下用 Next-Key Lock 防幻读。③ PG 的旧版本在表内堆积，需 autovacuum 持续清理；InnoDB 旧版本在 undo 里，由 purge 线程清理。
    </p>`;

  const isolationRows = [
    ['读未提交',   'READ UNCOMMITTED', '在 PG 中实际等价于 READ COMMITTED',  'PG 不允许脏读'],
    ['读已提交',   'READ COMMITTED',   '语句级快照，每次 SELECT 重新快照',   'PG 默认'],
    ['可重复读',   'REPEATABLE READ',  '事务级快照，整个事务用同一快照',     'PG 的 RR 已解决幻读（快照隔离）'],
    ['串行化',     'SERIALIZABLE',    'SSI（Serializable Snapshot Isolation）', '真正可串行化，性能损耗中等'],
  ];

  const isolationTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">级别</div>
        <div class="compare-card-header-cell frontend">SQL 名</div>
        <div class="compare-card-header-cell desc">机制</div>
      </div>
      ${isolationRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend"><code>${r[1]}</code></div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>设置方式</strong>：<code>SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;</code> 或 <code>SET default_transaction_isolation = 'repeatable read';</code><br>
      <strong>SSI 的精妙</strong>：PG 的 SERIALIZABLE 不靠加锁，而是检测事务间的"读写依赖"形成环——形成环则回滚其中一个事务（报 <code>could not serialize access</code>）。比传统两阶段锁并发性高得多。
    </p>`;

  const vacuumHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">VACUUM：MVCC 的代价</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>-- MVCC 的旧版本留在表中，需要 VACUUM 清理

-- 普通 VACUUM：标记死元组空间为可重用（不归还 OS）
VACUUM orders;

-- VACUUM FULL：重写整张表，归还空间给 OS（锁表！）
VACUUM FULL orders;     -- 生产慎用，会长时间锁表

-- ANALYZE：更新统计信息（优化器据此选索引）
ANALYZE orders;         -- 大表更新后必做

-- 组合命令
VACUUM ANALYZE orders;  -- 清理 + 更新统计
VACUUM FULL ANALYZE orders;  -- 全清理 + 统计（慎用）

-- autovacuum：后台自动 VACUUM（默认开启，生产必备）
SHOW autovacuum;             -- on
SHOW autovacuum_vacuum_threshold;   -- 50（死元组阈值）
SHOW autovacuum_vacuum_scale_factor; -- 0.2（20% 行变更触发）

-- 关键参数调优
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- 大表 5% 即触发
  autovacuum_analyze_scale_factor = 0.02
);

-- 查看 VACUUM 进度（9.6+）
SELECT * FROM pg_stat_progress_vacuum;

-- 查看表的死元组数
SELECT relname, n_dead_tup, n_live_tup,
       n_dead_tup::float / (n_live_tup + 1) AS dead_ratio
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">为什么 VACUUM 这么重要？</strong>① 不 VACUUM → 表膨胀（bloat），查询要扫描大量死元组，性能下降；② 长事务会阻塞 VACUUM（旧版本不能被清理）；③ 事务 ID 40 亿上限，不 VACUUM 会导致"事务 ID 回卷"灾难性故障。生产必须开 autovacuum 并按表调阈值。
    </p>`;

  const processHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px">Process-per-connection：进程模型</div>
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
        PostgreSQL 每个客户端连接 fork 一个独立 OS 进程（不是线程），共享内存区放缓存与锁。<br><br>
        <strong style="color:var(--text-primary)">优点</strong>：进程崩溃不影响其他连接（隔离性强）；多 CPU 利用率好；调试方便。<br><br>
        <strong style="color:var(--text-primary)">缺点</strong>：fork 进程开销大（几十 MB 内存 / 连接），单机撑不过几千连接；高并发场景<strong style="color:var(--text-primary)">必须用连接池</strong>。<br><br>
        <strong style="color:var(--text-primary)">连接池方案</strong>：① <code>PgBouncer</code>（外部，最常用）—— 多个客户端共享少量后端连接，transaction 模式下几千连接复用 100 后端；② <code>pgpool-II</code> —— 连接池 + 负载均衡 + 复制管理三合一；③ <code>PostgreSQL 14+ 内置 connection pooling</code>（暂未成熟）；④ 应用层 HikariCP 等池化。
      </div>
    </div>`;

  const typesHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">JSONB（杀手锏）</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          二进制 JSON，支持 GIN 索引，可高效查询嵌套字段。<br><br>
          <code>SELECT * FROM t WHERE attrs @&gt; '{"tags":["a"]}'</code><br>
          <code>SELECT attrs-&gt;&gt;'name' FROM t</code>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--blue);margin-bottom:8px">数组类型</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          原生支持一维/多维数组，可索引。<br><br>
          <code>tags TEXT[]</code><br>
          <code>WHERE 'react' = ANY(tags)</code><br>
          <code>WHERE tags &amp;&amp; ARRAY['react','vue']</code>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:8px">范围类型</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          表达连续区间，自带重叠/包含运算。<br><br>
          <code>tstzrange</code> 时间范围、<code>int4range</code> 整数范围<br>
          <code>WHERE r &amp;&amp; '[2026-01-01,2026-02-01]'</code>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--yellow);margin-bottom:8px">枚举类型</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          强类型枚举，比 MySQL 的字符串更安全。<br><br>
          <code>CREATE TYPE color AS ENUM ('red','green','blue');</code><br>
          <code>ALTER TYPE color ADD VALUE 'yellow';</code>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px">复合类型</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          自定义行类型，可作字段或参数。<br><br>
          <code>CREATE TYPE address AS (city TEXT, zip TEXT);</code><br>
          <code>addr address</code> 列直接存对象
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">UUID / 序列</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          pgcrypto 扩展或 uuid-ossp 生成 UUID。<br><br>
          <code>CREATE EXTENSION pgcrypto;</code><br>
          <code>DEFAULT gen_random_uuid()</code>
        </div>
      </div>
    </div>`;

  const jsonbCmd = `-- JSONB：MySQL JSON 的进化版

-- 建表
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}'
);

-- GIN 索引：加速嵌套字段查询
CREATE INDEX idx_attrs ON products USING GIN (attrs);
-- 支持 jsonb_path_ops（更紧凑，但只支持 @> 包含查询）
CREATE INDEX idx_attrs_path ON products USING GIN (attrs jsonb_path_ops);

-- 插入
INSERT INTO products (name, attrs) VALUES
  ('MacBook', '{"cpu":"M3","ram":16,"tags":["laptop","apple"],"price":12999}'),
  ('iPhone',  '{"cpu":"A17","ram":8,"tags":["phone","apple"],"price":7999}');

-- 查询操作符
-- ->> 取文本：返回 text
SELECT name, attrs ->> 'cpu' AS cpu FROM products;

-- -> 取 JSON：返回 jsonb
SELECT attrs -> 'tags' FROM products;

-- @> 包含匹配（最常用，走 GIN 索引）
SELECT * FROM products WHERE attrs @> '{"tags":["apple"]}';

-- ? 字段是否存在
SELECT * FROM products WHERE attrs ? 'price';

-- ?| ?& 字段是否存在（任一/全部）
SELECT * FROM products WHERE attrs ?| array['price','discount'];

-- #>> 路径取文本（深度嵌套）
SELECT attrs #>> '{address,city}' FROM products;

-- JSONB 修改（PG 不会原地改，是创建新对象）
UPDATE products SET attrs = jsonb_set(attrs, '{ram}', '32'::jsonb);
UPDATE products SET attrs = attrs || '{"discount":0.9}'::jsonb;   -- 追加键
UPDATE products SET attrs = attrs - 'discount';                    -- 删除键

-- JSON 路径查询（12+，SQL/JSON 标准）
SELECT * FROM products
WHERE attrs @? '$.tags[*] ? (@ == "apple")';

-- JSONB 与普通列的索引混合
CREATE INDEX idx_name_attrs ON products USING GIN (name gin_trgm_ops, attrs);`;

  const trapBox = ruleBox('warning',
    `<strong>PostgreSQL 新手常踩的坑</strong>：<br>
    ① <strong>长事务阻塞 VACUUM</strong>：开启但未提交的事务会阻塞 VACUUM 清理旧版本 → 表膨胀。监控 <code>pg_stat_activity</code> 中长时间 idle 的事务。<br>
    ② <strong>连接数配置过大</strong>：max_connections = 1000 + 进程模型 → 内存爆炸。改用 PgBouncer，max_connections = 100 即可。<br>
    ③ <strong>大表忘 ANALYZE</strong>：批量导入后没 ANALYZE → 统计信息过时 → 优化器选错索引。导入后立即 <code>ANALYZE</code>。<br>
    ④ <strong>VACUUM FULL 锁表</strong>：生产环境用 <code>pg_repack</code> 在线重写表，不要 VACUUM FULL。<br>
    ⑤ <strong>忘记开 autovacuum</strong>：默认开启，但有些云服务或老旧版本会关闭。检查 <code>SHOW autovacuum;</code>。<br>
    ⑥ <strong>事务 ID 回卷</strong>：长期不 VACUUM 会导致 40 亿事务 ID 回卷——数据库会强制停服做单机 VACUUM。监控 <code>age(datfrozenxid)</code>。<br>
    ⑦ <strong>schema 不显式指定</strong>：默认走 public schema，多业务混用易冲突。建议每业务独立 schema。`);

  return articleShell(t, `
    ${section('PostgreSQL 的设计哲学', conclusion)}
    ${section('MVCC 多版本并发控制', `<div class="section-body">${mvccHtml}</div>`)}
    ${section('四种事务隔离级别', isolationTable)}
    ${section('VACUUM：MVCC 的代价', `<div class="section-body">${vacuumHtml}</div>`)}
    ${section('进程模型：为什么需要连接池', `<div class="section-body">${processHtml}</div>`)}
    ${section('丰富数据类型', `<div class="section-body">${typesHtml}</div>`)}
    ${section('JSONB：MongoDB 杀手锏的反杀', codeBlock('PostgreSQL · JSONB 实战', 'dot-blue', 'sql', jsonbCmd))}
    ${section('新手常见陷阱', trapBox)}`);
}
