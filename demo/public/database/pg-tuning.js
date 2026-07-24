function renderPgTuning(t) {
  const conclusion = ruleBox('info',
    `PostgreSQL 的调优武器库远比 MySQL 丰富——<strong>5 种索引类型</strong>（B-tree / Hash / GiST / GIN / BRIN）针对不同场景，<strong>EXPLAIN ANALYZE</strong> 给出真实执行耗时，<strong>分区表</strong>原生支持百亿级大表，<strong>并行查询</strong>让 OLAP 场景性能数倍提升。理解这些工具，是 PostgreSQL 进阶的核心。`);

  const indexRows = [
    ['B-tree',  '默认',           '等值、范围、排序、唯一约束',  '最通用，PG 默认类型'],
    ['Hash',    'USING HASH',     '等值查询（不支持范围/排序）',  '9.6+ 后 WAL 日志支持，可用生产'],
    ['GiST',    'USING GIST',     '几何、范围、全文检索（tsvector）', '空间数据、近邻搜索（KNN）'],
    ['GIN',     'USING GIN',      'JSONB、数组、全文检索（tsvector）', '多值字段查询的首选，建得慢查得快'],
    ['BRIN',    'USING BRIN',     '时序数据（自然有序大表）',     '块级范围索引，占用极小'],
    ['SP-GiST', 'USING SPGiST',   '非平衡树（如 IP 路由、电话区号）', '空间分区树，特殊场景'],
  ];

  const indexTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">类型</div>
        <div class="compare-card-header-cell frontend">语法</div>
        <div class="compare-card-header-cell desc">适用</div>
      </div>
      ${indexRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>选择口诀</strong>：通用选 B-tree；JSONB/数组选 GIN；空间选 GiST；时序选 BRIN；等值且只等值选 Hash（罕见）。<br>
      <strong>部分索引</strong>：<code>CREATE INDEX ... WHERE status = 'PAID'</code>，只为部分行建索引，省空间加速查询。<br>
      <strong>表达式索引</strong>：<code>CREATE INDEX idx_lower_email ON users (lower(email))</code>，让函数运算走索引。
    </p>`;

  const explainCmd = `-- EXPLAIN：看执行计划（不执行）
EXPLAIN SELECT * FROM orders WHERE user_id = 1001;

-- EXPLAIN ANALYZE：执行并显示真实耗时（会真正执行！）
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 1001;

-- BUFFERS：显示磁盘/缓存 IO
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = 1001;

-- VERBOSE：显示输出字段
EXPLAIN (ANALYZE, VERBOSE, BUFFERS, FORMAT JSON) SELECT ...;

-- 关键字段解读：
--   Seq Scan          → 全表扫描（❌ 需加索引）
--   Index Scan        → 走索引取数据（✅）
--   Index Only Scan   → 覆盖索引，不回表（最佳）
--   Bitmap Index Scan → 位图索引扫描，大量匹配时优于 Index Scan
--   Bitmap Heap Scan  → 位图索引后回表取数据
--   Hash Join         → 用哈希表做 JOIN（等值 JOIN 首选）
--   Merge Join        → 排序后归并 JOIN（已排序时最优）
--   Nested Loop       → 嵌套循环 JOIN（小表驱动大表）
--   Sort              → 排序（若数据已有序可省）
--   HashAggregate     → 哈希聚合
--   Gather / Gather Merge → 并行查询节点

-- cost 估算：
--   cost=0.00..34.50  → 启动成本..总成本
--   rows=100          → 预估返回行数
--   width=64          → 平均行宽（字节）

-- 真实执行（ANALYZE）：
--   actual time=0.05..0.18   → 实际耗时（ms）
--   rows=100                 → 实际返回行数
--   loops=1                  → 循环次数
--   Buffers: shared hit=10 read=2 → 缓存命中/磁盘读取

-- 优化器选择错误索引时：
--   1. ANALYZE 更新统计信息（最常见原因）
--   2. 调整 random_page_cost / seq_page_cost
--   3. SET enable_seqscan = off; 临时禁用全表扫描（调试用）`;

  const analyzeCmd = `-- ANALYZE：更新统计信息，优化器据此选索引

-- 单表分析
ANALYZE orders;

-- 指定字段（大表只分析关键字段）
ANALYZE orders(user_id, status);

-- 全库分析（慢，定期跑）
ANALYZE VERBOSE;

-- 查看统计信息
SELECT * FROM pg_stats WHERE tablename = 'orders' AND attname = 'user_id';
--   most_common_vals      ：高频值
--   most_common_freqs      ：高频值频率
--   histogram_bounds       ：直方图边界
--   correlation            ：物理排序与逻辑排序相关性（影响是否选 index scan）

-- 自动统计（autovacuum 自动触发）
SHOW track_counts;          -- 默认 on，收集统计
SHOW autoanalyze_scale_factor;  -- 默认 0.1（10% 行变更触发）

-- 大批量导入后立即手动 ANALYZE
COPY orders FROM '/data/orders.csv' WITH (FORMAT csv);
ANALYZE orders;     -- 不然优化器还是用旧统计，可能选错索引

-- 扩展统计（10+）
-- 多列相关性：让优化器知道 (a, b) 一起出现的频率
CREATE STATISTICS st_orders_user_status (ndistinct, dependencies)
  ON user_id, status FROM orders;
ANALYZE orders;`;

  const joinCmd = `-- JOIN 三种策略

-- 1. Nested Loop Join：小表驱动大表
EXPLAIN SELECT * FROM users u JOIN orders o ON u.id = o.user_id;
--   for each row in users:
--     for each matching row in orders:
--       output
-- 适用：内表小或有索引；驱动表过滤后行数少

-- 2. Hash Join：等值 JOIN 的默认选择
EXPLAIN SELECT * FROM orders o JOIN users u ON o.user_id = u.id;
--   1. 扫描小表建哈希表（内存中）
--   2. 扫描大表，每行查哈希表
-- 适用：等值 JOIN、无索引、大结果集
-- 注意：work_mem 不够会落盘，性能骤降

-- 3. Merge Join：两边都排序后归并
EXPLAIN SELECT * FROM orders o JOIN users u ON o.user_id = u.id ORDER BY u.id;
--   1. 两边按 JOIN 字段排序
--   2. 双指针归并
-- 适用：两边已排序（有索引）或要求排序输出

-- 调优参数
SHOW work_mem;          -- 单查询内存（默认 4MB，JOIN/Sort 太小会落盘）
SHOW hash_mem_multiplier;  -- Hash Join 内存倍数
SHOW enable_nestloop;   -- 临时禁用（调试）
SHOW enable_hashjoin;
SHOW enable_mergejoin;

-- 大 JOIN 慢时：
--   1. 调大 work_mem（避免 Hash Join 落盘）
--   2. 给被驱动表的 JOIN 字段加索引
--   3. ANALYZE 更新统计
--   4. 考虑分区表减少 JOIN 范围`;

  const partitionCmd = `-- 分区表：原生支持百亿级大表

-- 范围分区（最常用，按时间）
CREATE TABLE orders (
  id BIGSERIAL,
  user_id BIGINT,
  amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- 创建子分区
CREATE TABLE orders_2026_01 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE orders_2026_02 PARTITION OF orders
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ...

-- 列表分区（按枚举值，如按地区）
CREATE TABLE users (...) PARTITION BY LIST (region);
CREATE TABLE users_cn PARTITION OF users FOR VALUES IN ('cn');
CREATE TABLE users_us PARTITION OF users FOR VALUES IN ('us');

-- 哈希分区（均匀打散）
CREATE TABLE logs (...) PARTITION BY HASH (user_id);
CREATE TABLE logs_0 PARTITION OF logs FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE logs_1 PARTITION OF logs FOR VALUES WITH (modulus 4, remainder 1);

-- 自动分区（pg_partman 扩展，自动建子分区）
CREATE EXTENSION pg_partman;
SELECT partman.create_parent('public.orders', 'created_at', 'native', 'monthly');

-- 默认分区（兜底）
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

-- 查询分区裁剪（partition pruning）
EXPLAIN SELECT * FROM orders WHERE created_at >= '2026-02-01';
--   只扫 orders_2026_02，不扫其他分区

-- 子分区索引（在父表上建会传播到所有子分区）
CREATE INDEX idx_orders_user ON orders (user_id);
--   等价于在每个子分区上建索引

-- 分区维护：老数据归档
-- 直接 DROP 老分区，比 DELETE 快几个数量级
DROP TABLE orders_2024_01;

-- DETACH 后归档（不阻塞查询）
ALTER TABLE orders_2024_01 DETACH PARTITION;`;

  const parallelCmd = `-- 并行查询（9.6+，OLAP 大幅提速）

-- 默认开启，看是否走并行
EXPLAIN ANALYZE SELECT count(*) FROM orders WHERE amount > 100;

-- 关键节点：
--   Gather           → 收集并行 worker 结果
--   Gather Merge     → 收集并保持有序
--   Parallel Seq Scan → 多 worker 并行扫描

-- 并行参数
SHOW max_parallel_workers;            -- 总 worker 数（默认 8）
SHOW max_parallel_workers_per_gather; -- 单查询并行度（默认 2）
SHOW min_parallel_table_scan_size;    -- 触发并行的表最小（默认 8MB）
SHOW parallel_setup_cost;             -- 并行启动成本
SHOW parallel_tuple_cost;             -- 每行并行成本

-- 大表统计时调大并行度
SET max_parallel_workers_per_gather = 4;
SELECT count(*), sum(amount) FROM orders GROUP BY user_id;

-- 并行不生效的常见原因：
--   1. 查询太"小"（min_parallel_table_scan_size 阈值未到）
--   2. 涉及写操作（INSERT/UPDATE/DELETE 不并行）
--   3. 有游标 / FOR UPDATE
--   4. 含易失函数（如 random()）
--   5. work_mem 不够（并行 worker 间共享）

-- JIT 编译（11+，复杂查询加速）
SHOW jit;             -- 默认 on
SHOW jit_above_cost;  -- 默认 100000，复杂查询才触发`;

  const tipsBox = ruleBox('success',
    `<strong>查询调优经验</strong>：<br>
    ① <strong>大表批量导入后立即 ANALYZE</strong>——否则优化器用旧统计选错索引；<br>
    ② <strong>work_mem 调到 16~64MB</strong>——避免 Hash Join/Sort 落盘；<br>
    ③ <strong>覆盖索引用 Index Only Scan</strong>——把查询列加入索引；<br>
    ④ <strong>范围查询优先 B-tree</strong>、<strong>JSONB/数组用 GIN</strong>、<strong>时序用 BRIN</strong>；<br>
    ⑤ <strong>大表用分区</strong>——按时间/用户哈希分区，配合分区裁剪；<br>
    ⑥ <strong>等值 JOIN 走 Hash</strong>——小表在内、大表在外；<br>
    ⑦ <strong>避免 SELECT *</strong>——破坏覆盖索引、增加网络与解析开销；<br>
    ⑧ <strong>慢查询用 pg_stat_statements</strong>——按总耗时/平均耗时/调用次数排序定位热点；<br>
    ⑨ <strong>更新统计前先 ANALYZE</strong>——再看 EXPLAIN；<br>
    ⑩ <strong>关闭 JIT 看小查询</strong>——JIT 编译本身有开销，简单查询关闭反而更快。`);

  return articleShell(t, `
    ${section('PostgreSQL 调优武器库', conclusion)}
    ${section('5 种索引类型', indexTable)}
    ${section('EXPLAIN ANALYZE：执行计划', codeBlock('PostgreSQL · EXPLAIN', 'dot-blue', 'sql', explainCmd))}
    ${section('ANALYZE：统计信息与优化器', codeBlock('PostgreSQL · 统计信息', 'dot-orange', 'sql', analyzeCmd))}
    ${section('JOIN 三种策略', codeBlock('PostgreSQL · JOIN 优化', 'dot-green', 'sql', joinCmd))}
    ${section('分区表：百亿级大表方案', codeBlock('PostgreSQL · 分区表', 'dot-orange', 'sql', partitionCmd))}
    ${section('并行查询：OLAP 加速', codeBlock('PostgreSQL · 并行与 JIT', 'dot-blue', 'sql', parallelCmd))}
    ${section('查询调优经验十条', tipsBox)}`);
}
