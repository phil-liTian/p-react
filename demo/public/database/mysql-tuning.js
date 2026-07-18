function renderMysqlTuning(t) {
  const conclusion = ruleBox('accent',
    `SQL 调优的目标是<strong>让 MySQL 少扫描数据、少排序、少回表</strong>。一个查询从秒级降到毫秒级，往往不需要换硬件——只需要调一行 SQL、加一个索引、改一种写法。核心工具是 <strong>EXPLAIN</strong>（看执行计划）+ <strong>慢查询日志</strong>（定位慢 SQL），核心思路是<strong>减少 rows、消除 filesort / temporary、争取 Using index</strong>。`);

  const workflowHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">SQL 调优工作流</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>1. 开启慢查询日志 → 收集线上慢 SQL（&gt; 1s 或业务阈值）
       ↓
2. EXPLAIN 分析每条慢 SQL
       ↓
3. 看关键字段：type / key / rows / Extra
       ↓
4. 针对性优化：
   - 没走索引 → 加索引 / 改写 SQL 让索引生效
   - 走了索引但 rows 大 → 索引区分度低 / 选错索引
   - Using filesort → ORDER BY 字段加入索引
   - Using temporary → GROUP BY 字段加入索引
       ↓
5. 验证：再次 EXPLAIN，对比 rows 与执行时间
       ↓
6. 上线：通过 pt-online-schema-change 或 gh-ost 在线加索引</code></pre>
    </div>`;

  const slowlogSql = `-- 开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;          -- 超过 1s 的算慢查询
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL log_queries_not_using_indexes = ON;  -- 没走索引的也记录

-- 查看慢查询日志位置
SHOW VARIABLES LIKE 'slow_query_log_file';

-- 用 mysqldumpslow 分析慢日志（按返回行数 / 执行时间 / 次数排序）
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
#   -s t：按总时间排序   -s l：按锁时间   -s r：按行数
#   -t 10：取前 10 条

-- 8.0+ 推荐用 performance_schema 直接查 SQL 维度统计
SELECT DIGEST_TEXT, COUNT_STAR, AVG_TIMER_WAIT/1e9 AS avg_ms,
       SUM_ROWS_EXAMINED, SUM_ROWS_SENT
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC LIMIT 10;`;

  const typeRows = [
    ['system',  '表只有一行（系统表）',           '最快'],
    ['const',   '主键或唯一索引等值匹配',         '极快，最多一行'],
    ['eq_ref',  'JOIN 用主键/唯一索引等值关联',   '最快 JOIN 类型'],
    ['ref',     '普通索引等值匹配',               '常见，性能良好'],
    ['range',   '索引范围扫描（>, <, BETWEEN, IN）', '可接受'],
    ['index',   '扫描整棵索引树',                 '比 ALL 好，但仍是全索引扫描'],
    ['ALL',     '全表扫描',                       '❌ 需优化：加索引或改写 SQL'],
  ];

  const typeTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">type 值</div>
        <div class="compare-card-header-cell frontend">含义</div>
        <div class="compare-card-header-cell desc">性能判断</div>
      </div>
      ${typeRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>`;

  const extraRows = [
    ['Using index',           '查询列都被索引覆盖，无需回表',          '✅ 最佳'],
    ['Using where',           'Server 层过滤',                        '一般，看 rows 大小'],
    ['Using index condition', '索引下推（ICP），减少回表',             '✅ 良好'],
    ['Using filesort',        '无法用索引排序，额外排序',              '⚠ 需优化 ORDER BY 字段'],
    ['Using temporary',       '用临时表（GROUP BY / DISTINCT）',       '⚠ 需优化 GROUP BY 字段'],
    ['Using join buffer',     'JOIN 被驱动表无索引，用 Block Nested Loop', '❌ 需加索引'],
    ['Using MRR',             '多范围读优化，回表顺序化',              '✅ 良好'],
  ];

  const extraTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">Extra 值</div>
        <div class="compare-card-header-cell frontend">含义</div>
        <div class="compare-card-header-cell desc">判断</div>
      </div>
      ${extraRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>`;

  const joinSql = `-- 场景：查询用户的订单详情
-- 表：orders(1000w) / users(10w) / order_items(5000w)

-- ❌ 慢：JOIN 字段没索引 + 大表做驱动表
SELECT * FROM orders o
  JOIN users u ON o.user_name = u.name       -- user_name 没索引 → Using join buffer
  JOIN order_items oi ON o.id = oi.order_id  -- order_id 没索引 → 全表扫描 order_items
WHERE o.created_at > '2026-01-01';

-- ✅ 优化：
--   1. 被驱动表的 JOIN 字段加索引（u.name、oi.order_id）
--   2. 小表驱动大表（MySQL 8.0 优化器自动选择，5.x 看 JOIN 顺序）
--   3. 只查需要的列，避免 SELECT *

CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

SELECT o.id, o.amount, u.name, oi.product_name
FROM orders o
  JOIN users u ON o.user_id = u.id            -- 改用主键关联（更快）
  JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at > '2026-01-01';

-- 关联子查询 vs JOIN：
--   IN 子查询在 5.6+ 会自动改写为半连接（Semi-Join），性能接近 JOIN
--   但 NOT IN 仍可能慢，建议改用 LEFT JOIN ... WHERE ... IS NULL`;

  const pageSql = `-- 场景：分页查询订单（深分页问题）

-- ❌ 慢：LIMIT 1000000, 20
-- MySQL 会扫描前 1000020 行再丢弃前 100w 行，O(n) 复杂度
SELECT * FROM orders ORDER BY id LIMIT 1000000, 20;

-- ✅ 优化 1：延迟关联（覆盖索引 + 回表）
SELECT o.* FROM orders o
  JOIN (SELECT id FROM orders ORDER BY id LIMIT 1000000, 20) t
  ON o.id = t.id;
-- 子查询走主键索引（覆盖索引），只回表 20 次

-- ✅ 优化 2：游标分页（推荐，O(1)）
-- 前端记住上一页最后一条的 id，下次用 WHERE id > last_id
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 20;
-- 适合"上一页/下一页"场景，不支持跳页

-- ✅ 优化 3：业务限制不允许深分页
-- 产品层面限制最多翻 100 页（淘宝、Google 都这么做）

-- count(*) 优化：
--   MyISAM 直接返回元数据（O(1)）；InnoDB 需要扫描
--   优化 1：覆盖索引 count(idx_field) 比 count(*) 快
--   优化 2：业务允许时用估算值（SHOW TABLE STATUS LIKE 'orders'）
--   优化 3：Redis 维护计数器，异步刷新
--   优化 4：分离热数据，老数据单独表`;

  const groupSql = `-- 场景：统计每个用户的订单数和总金额

-- ❌ 慢：GROUP BY 字段无索引 + filesort + temporary
SELECT user_id, COUNT(*), SUM(amount)
FROM orders
WHERE created_at > '2026-01-01'
GROUP BY user_id
ORDER BY COUNT(*) DESC;

-- ✅ 优化：给 GROUP BY 字段加索引
CREATE INDEX idx_user_created ON orders(user_id, created_at);

-- MySQL 8.0+ 不再默认 ORDER BY 跟随 GROUP BY
-- 显式排序会触发 filesort，业务能接受就避免 ORDER BY

-- DISTINCT 优化：本质等价于 GROUP BY
SELECT DISTINCT user_id FROM orders;        -- 慢
SELECT user_id FROM orders GROUP BY user_id; -- 等价，加索引后都快

-- 函数索引（8.0+）：让函数运算走索引
CREATE INDEX idx_created_year ON orders((YEAR(created_at)));
SELECT * FROM orders WHERE YEAR(created_at) = 2026;  -- 走索引`;

  const tipsHtml = `
    <ul style="margin:0;padding-left:20px;font-size:12.5px;color:var(--text-secondary);line-height:1.9">
      <li><strong>只查需要的列</strong>：<code>SELECT *</code> 几乎总是错的——多查的列让覆盖索引失效、增加网络传输、破坏 buffer pool 命中率</li>
      <li><strong>小结果集驱动大结果集</strong>：JOIN 时小表做驱动表，循环次数少（8.0 优化器会自动选）</li>
      <li><strong>批量插入优化</strong>：单条 INSERT 多次 → 用 <code>INSERT ... VALUES (...),(...),(...)</code> 批量插入，事务开销摊薄</li>
      <li><strong>批量 UPDATE 分批</strong>：一次 UPDATE 100w 行会长时间持锁，拆成每批 1000 行循环</li>
      <li><strong>避免 SELECT FOR UPDATE 长持锁</strong>：用乐观锁（version 字段）替代悲观锁，减少锁等待</li>
      <li><strong>用 EXISTS 代替 IN</strong>：子查询结果集大时 <code>EXISTS</code> 通常更快（一旦匹配即返回）</li>
      <li><strong>UNION ALL 而非 UNION</strong>：<code>UNION</code> 需要去重（temporary + filesort），确定无重复用 <code>UNION ALL</code></li>
      <li><strong>预编译语句（PreparedStatement）</strong>：避免 SQL 解析与计划生成的开销，防 SQL 注入</li>
      <li><strong>连接池配置合理</strong>：HikariCP 的 maxSize 别超过 <code>innodb_thread_concurrency</code>，否则上下文切换反而拖慢</li>
    </ul>`;

  return articleShell(t, `
    ${section('SQL 调优的本质', conclusion)}
    ${section('调优工作流', `<div class="section-body">${workflowHtml}</div>`)
    }
    ${section('慢查询日志：定位慢 SQL', codeBlock('SQL · 慢查询日志与分析', 'dot-blue', 'sql', slowlogSql))}
    ${section('EXPLAIN type 字段', typeTable)}
    ${section('EXPLAIN Extra 字段', extraTable)}
    ${section('JOIN 优化：小表驱动大表', codeBlock('SQL · JOIN 调优', 'dot-orange', 'sql', joinSql))}
    ${section('深分页与 count(*) 优化', codeBlock('SQL · 分页与计数优化', 'dot-red', 'sql', pageSql))}
    ${section('GROUP BY / DISTINCT 优化', codeBlock('SQL · 聚合查询调优', 'dot-orange', 'sql', groupSql))}
    ${section('其他调优经验', `<div class="section-body">${tipsHtml}</div>`)}`);
}
