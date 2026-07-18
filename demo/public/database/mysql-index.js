function renderMysqlIndex(t) {
  const conclusion = ruleBox('accent',
    `MySQL 索引的本质是<strong>让查找从"全表扫描 O(n)"变成"树形查找 O(log n)"</strong>。InnoDB 的索引存的是一棵 <strong>B+ 树</strong>：所有数据都挂在叶子节点上，非叶子节点只存索引键用于导航。理解索引就理解了 MySQL 的<strong>性能命门</strong>——一个设计良好的索引能让查询从分钟级降到毫秒级，而一个错误的索引会让写放大、占空间、还吃不到收益。`);

  const bplusHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">🌲 B+ 树结构（InnoDB 索引存储模型）</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>                [10 | 20 | 30]              ← 非叶子节点：只放索引键（导航）
                /     |      |     \\
        [1,5,8][10,12,15][20,22,28][30,35,40]  ← 叶子节点：放完整数据行
              ↔    ↔    ↔    ↔    ↔            ← 叶子之间双向链表（范围查询友好）

特点：
  • 数据只存叶子节点（聚簇索引存整行，二级索引存主键值）
  • 叶子节点形成双向链表 → 范围查询：找到起点后顺着链表扫即可
  • 树高通常 3~4 层即可支撑千万级行数（每层约 1000 个分支节点）
  • 查找复杂度 O(log n)，远低于全表扫描 O(n)</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">为什么选 B+ 树而不是 B 树 / 红黑树 / Hash？</strong><br>
      Hash 索引等值查询 O(1) 但不支持范围查询；B 树非叶子也存数据导致单节点 key 数量少、树更高；红黑树是二叉，千万级数据树高 30+。B+ 树的"矮胖 + 叶子链表"在磁盘 IO 上是最优解——一次 IO 读一页（默认 16KB），能加载更多索引键，最大化扇出。
    </p>`;

  const clusterHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">① 聚簇索引（Clustered）</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <strong style="color:var(--text-primary)">数据和主键索引存同一棵 B+ 树</strong>，叶子节点直接是完整行数据。<br><br>
          • 一张表只能有一个聚簇索引（主键）<br>
          • 主键查询无需回表<br>
          • 没有显式主键时，InnoDB 会用唯一非空索引；都没有则生成隐藏 6 字节 <code>ROW_ID</code>
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--blue);margin-bottom:8px">② 二级索引（Secondary）</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          叶子节点存的是<strong style="color:var(--text-primary)">主键值</strong>，不是行数据。<br><br>
          • 走二级索引找到主键 → 再去聚簇索引查完整行 = <strong style="color:var(--text-primary)">回表</strong><br>
          • <code>SELECT *</code> 默认会回表，代价高<br>
          • 一张表可以有多个二级索引
        </div>
      </div>
    </div>
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px">为什么主键建议自增 BIGINT？</div>
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
        自增 ID 保证新行<strong style="color:var(--text-primary)">顺序写入 B+ 树叶子末尾</strong>，避免页分裂（分裂要搬移数据 + 调整链表，触发大量随机 IO）。UUID 反向插入会让 B+ 树频繁分裂，写性能断崖式下降。
      </div>
    </div>`;

  const backtrackSql = `-- orders 表结构：id (PK) / user_id / status / amount / created_at
CREATE INDEX idx_user_status ON orders(user_id, status);

-- 查询 1：走二级索引 → 回表
SELECT * FROM orders WHERE user_id = 1001;
-- 执行过程：
--   1. 在 idx_user_status 的 B+ 树里找到 user_id=1001 的叶子节点
--   2. 叶子节点存的是 [user_id, status, 主键 id]
--   3. 用主键 id 回到聚簇索引（主键 B+ 树）取出完整行
--   4. 若命中 100 行则回表 100 次（"回表代价"）

-- 查询 2：覆盖索引 → 不回表
SELECT id, user_id, status FROM orders WHERE user_id = 1001;
-- 索引 idx_user_status 已经包含 [user_id, status, 主键 id]，
-- 要查的字段全在索引里 → 直接返回，无需回表

-- 用 EXPLAIN 看 Extra 列：
--   Using index       → 覆盖索引，性能最佳
--   Using where       → 回表后过滤
--   Using filesort    → 额外排序，需要优化
--   Using temporary   → 临时表，通常需要优化`;

  const leftmostSql = `-- 联合索引 (a, b, c) 在 B+ 树中按 a→b→c 顺序排序
CREATE INDEX idx_abc ON t(a, b, c);

-- ✅ 命中索引（满足最左前缀）
WHERE a = 1                          -- 用到 a
WHERE a = 1 AND b = 2                -- 用到 a, b
WHERE a = 1 AND b = 2 AND c = 3      -- 用到 a, b, c
WHERE a = 1 AND c = 3                -- 只用到 a（c 用不到，中间断开了）

-- ❌ 不命中索引（缺少最左前缀 a）
WHERE b = 2
WHERE c = 3
WHERE b = 2 AND c = 3

-- ⚠ 范围查询会断开后续字段
WHERE a > 1 AND b = 2                -- 只用到 a（a 是范围，b 无法用索引）
WHERE a = 1 AND b > 2 AND c = 3      -- 用到 a, b（b 范围，c 用不到）

-- 💡 范围查询 vs 等值查询对索引的影响：
--   BETWEEN / > / < / LIKE 'xxx%' 都是范围 → 后续字段失效
--   IN (...) 在新版本优化器中等价于多个等值 → 后续字段可继续用
--   所以联合索引排序规则：等值字段放前面、范围字段放最后`;

  const coverBox = ruleBox('success',
    `<strong>覆盖索引（Covering Index）</strong>：查询的列<strong>全部包含在索引中</strong>时，无需回表，直接从索引 B+ 树的叶子节点返回数据。<code>EXPLAIN</code> 中显示 <code>Extra: Using index</code>。优化技巧：<code>SELECT *</code> 改成具体列名；高频查询的列加入联合索引（注意列数与写入代价的权衡）；<code>count(*)</code> 走最小的二级索引而非主键。`);

  const icpBox = ruleBox('info',
    `<strong>索引下推（Index Condition Pushdown, ICP）</strong>：MySQL 5.6 引入。在没有 ICP 时，引擎层按索引取出主键 → 回表取完整行 → Server 层用 WHERE 过滤；有了 ICP 后，<strong>能下推到索引层的 WHERE 条件先在索引层过滤</strong>，减少回表次数。例：<code>WHERE name LIKE '张%' AND age = 20</code>，<code>(name, age)</code> 联合索引下，ICP 在索引层就过滤掉 age≠20 的行，大幅减少回表。<code>EXPLAIN</code> 显示 <code>Extra: Using index condition</code>。`);

  const explainHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">EXPLAIN 关键字段速查</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="color:var(--text-secondary);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px">字段</th>
            <th style="text-align:left;padding:6px 8px">含义</th>
            <th style="text-align:left;padding:6px 8px">重点关注</th>
          </tr>
        </thead>
        <tbody style="color:var(--text-secondary)">
          <tr><td style="padding:6px 8px"><code>type</code></td><td>访问类型</td><td><code>const &gt; eq_ref &gt; ref &gt; range &gt; index &gt; ALL</code>，至少要到 <code>range</code></td></tr>
          <tr><td style="padding:6px 8px"><code>key</code></td><td>实际使用的索引</td><td>NULL 表示没走索引；与 <code>possible_keys</code> 对比看优化器选择</td></tr>
          <tr><td style="padding:6px 8px"><code>rows</code></td><td>预估扫描行数</td><td>越小越好，是性能的主要信号</td></tr>
          <tr><td style="padding:6px 8px"><code>Extra</code></td><td>附加信息</td><td><code>Using index</code> 最佳；<code>filesort</code> / <code>temporary</code> 需优化</td></tr>
          <tr><td style="padding:6px 8px"><code>ref</code></td><td>索引比较的常量/列</td><td>JOIN 时判断关联条件是否走索引</td></tr>
        </tbody>
      </table>
    </div>`;

  const antiHtml = `
    <ul style="margin:0;padding-left:20px;font-size:12.5px;color:var(--text-secondary);line-height:1.9">
      <li><strong>在区分度低的列上建索引</strong>：性别、状态这种只有几种值的列，索引几乎无用——优化器会直接全表扫描</li>
      <li><strong>频繁更新的列建过多索引</strong>：每次 UPDATE 都要维护所有相关 B+ 树，写性能骤降</li>
      <li><strong>对索引列使用函数或运算</strong>：<code>WHERE YEAR(created_at) = 2026</code> 会让索引失效，改成 <code>WHERE created_at &gt;= '2026-01-01'</code></li>
      <li><strong>隐式类型转换</strong>：<code>WHERE phone = 13800138000</code>（phone 是 varchar）会让索引失效，传字符串 <code>'13800138000'</code></li>
      <li><strong>左模糊查询</strong>：<code>LIKE '%abc'</code> 无法走索引；<code>LIKE 'abc%'</code> 可以。全文搜索请用 FULLTEXT 或 Elasticsearch</li>
      <li><strong>OR 中部分条件无索引</strong>：会导致整个查询放弃索引；可拆成 UNION ALL 或确保每个 OR 条件都有索引</li>
      <li><strong>索引列上加 NOT / != / NOT IN</strong>：通常无法用索引，等值/范围才能走 B+ 树</li>
    </ul>`;

  return articleShell(t, `
    ${section('索引的本质', conclusion)}
    ${section('B+ 树：InnoDB 的索引存储模型', `<div class="section-body">${bplusHtml}</div>`)}
    ${section('聚簇索引 vs 二级索引', clusterHtml)}
    ${section('回表：二级索引的隐藏代价', codeBlock('SQL · 回表 vs 覆盖索引', 'dot-blue', 'sql', backtrackSql))}
    ${section('最左匹配：联合索引的核心规则', codeBlock('SQL · 联合索引的最左前缀', 'dot-orange', 'sql', leftmostSql))}
    ${section('覆盖索引：避免回表的杀手锏', coverBox)}
    ${section('索引下推（ICP）：减少回表次数', icpBox)}
    ${section('EXPLAIN：执行计划解读', explainHtml)}
    ${section('索引失效的常见陷阱', `<div class="section-body">${antiHtml}</div>`)}`);
}
