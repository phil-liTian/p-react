function renderMongodbAggregation(t) {
  const conclusion = ruleBox('success',
    `MongoDB 聚合管道（Aggregation Pipeline）是其最强的查询能力——把数据流过一系列阶段（Stage），每个阶段做过滤、变换、分组、排序，最终输出结果。类比 <strong>JS 数组的 map/filter/reduce 链式调用</strong>，前端工程师天然理解。掌握常用 Stage、<code>$lookup</code>、<code>$facet</code>、索引优化与 explain，是 MongoDB 进阶的核心。`);

  const stageRows = [
    ['$match',     'WHERE',           '过滤文档，尽早放最前缩小数据量'],
    ['$project',   'SELECT',          '字段投影、重命名、计算新字段'],
    ['$group',     'GROUP BY',        '按 _id 分组聚合（$sum/$avg/$max/$min/$push）'],
    ['$sort',      'ORDER BY',        '排序，配合 limit 用索引优化'],
    ['$limit',     'LIMIT',           '限制输出数量'],
    ['$skip',      'OFFSET',          '跳过 N 条，深分页性能差'],
    ['$lookup',    'LEFT JOIN',       '左外连接另一集合'],
    ['$unwind',    '—',               '把数组字段拆成多文档'],
    ['$facet',     '—',               '并行多管道，常用于分页+总数'],
    ['$bucket',    '—',               '按边界分桶（年龄段、价格段）'],
    ['$count',     'COUNT',           '返回文档数'],
    ['$addFields', '—',               '追加新字段（不覆盖原字段）'],
  ];

  const stageTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">Stage</div>
        <div class="compare-card-header-cell frontend">SQL 类比</div>
        <div class="compare-card-header-cell desc">作用</div>
      </div>
      ${stageRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>`;

  const lookupCmd = `// $lookup：MongoDB 的 LEFT JOIN（4.0+ 支持非 equality 条件）
db.orders.aggregate([
  {
    $lookup: {
      from: 'users',                  // 被连接集合
      localField: 'userId',           // orders 的字段
      foreignField: '_id',            // users 的字段
      as: 'user'                      // 输出字段名（数组）
    }
  },
  // user 是数组，$unwind 展开成单对象（LEFT JOIN 行为）
  { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
  { $project: { orderId: '$_id', userName: '$user.name', amount: 1 } }
]);

// 4.0+ 支持复杂条件（pipeline 形式）
db.orders.aggregate([
  {
    $lookup: {
      from: 'products',
      let: { pid: '$productId', qty: '$quantity' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$_id', '$$pid'] },
          { $gte: ['$stock', '$$qty'] }    // 库存够的才连
        ]}}},
        { $project: { name: 1, stock: 1 } }
      ],
      as: 'availableProduct'
    }
  }
]);

// 性能要点：
//   - localField/foreignField 必须有索引，否则全表扫描
//   - $lookup 后接 $unwind 时，4.0+ 用 $unwind+lookup 合并优化
//   - 大集合 $lookup 性能仍弱于 MySQL JOIN，能嵌套就嵌套`;

  const facetCmd = `// $facet：一次查询返回多个聚合结果（分页 + 总数 + 聚合）
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  {
    $facet: {
      // 分页数据
      data: [
        { $sort: { createdAt: -1 } },
        { $skip: 20 },
        { $limit: 10 },
        { $project: { _id: 1, amount: 1, createdAt: 1 } }
      ],
      // 总数（用于分页器）
      total: [
        { $count: 'count' }
      ],
      // 统计聚合
      stats: [
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, avgAmount: { $avg: '$amount' } } }
      ]
    }
  }
]);
// 返回：{ data: [...10条], total: [{count: 100}], stats: [{totalAmount:..., avgAmount:...}] }

// $bucket：按边界自动分桶
db.users.aggregate([
  {
    $bucket: {
      groupBy: '$age',
      boundaries: [0, 18, 30, 50, 100],   // [0,18) [18,30) [30,50) [50,100)
      default: 'unknown',
      output: { count: { $sum: 1 }, names: { $push: '$name' } }
    }
  }
]);

// $bucketAuto：自动分桶（指定桶数）
db.orders.aggregate([
  { $bucketAuto: { groupBy: '$amount', buckets: 5 } }
]);`;

  const windowCmd = `// 窗口函数（5.0+）：$setWindowFields
// 类似 SQL 的 ROW_NUMBER / RANK / SUM OVER
db.orders.aggregate([
  {
    $setWindowFields: {
      partitionBy: '$userId',           // 按用户分区
      sortBy: { createdAt: -1 },        // 区内按时间倒序
      output: {
        rank: { $documentNumber: {} },  // 行号（每个用户内独立计数）
        userTotal: {
          $sum: '$amount',
          window: { documents: ['unbounded', 'current'] }   // 累计求和
        }
      }
    }
  },
  { $match: { rank: { $lte: 3 } } }     // 每个用户最近 3 单
]);

// 窗口函数支持的累计/聚合：
//   $rank / $denseRank / $documentNumber
//   $sum / $avg / $min / $max / $count
//   $push / $addToSet
//   $stdDevPop / $stdDevSamp
//   $expMovingAvg（指数移动平均，时序分析）

// 常见场景：
//   - 每个用户最近 N 单
//   - 累计销售额、同比环比
//   - 排名、Top N
//   - 移动平均（股票、监控）`;

  const explainCmd = `// explain：执行计划
db.orders.find({ userId: 'u1001', status: 'PAID' }).explain('executionStats');

// 关键字段：
//   winningPlan.stage:
//     COLLSCAN   → 全集合扫描（❌ 需加索引）
//     IXSCAN     → 走索引（✅）
//     FETCH      → 索引取出后回表（正常）
//     SORT       → 内存排序（⚠ 大数据需优化）
//     LIMIT_SKIP → 跳过 + 限制
//   executionStats:
//     totalDocsExamined   → 扫描文档数，应接近返回数
//     totalKeysExamined   → 扫描索引 key 数
//     executionTimeMillis → 耗时
//   indexBounds: 索引使用范围

// 理想状态：totalDocsExamined ≈ nReturned（扫描数 ≈ 返回数）
// 若扫描 100w 返回 10 条 → 索引设计有问题

// 聚合管道的 explain
db.orders.explain('executionStats').aggregate([...]);

// 慢查询监控
db.setProfilingLevel(1, { slowms: 100 });   // 记录 > 100ms 的查询
db.system.profile.find().sort({ ts: -1 }).limit(10);
// 0 = 关闭，1 = 记录慢查询，2 = 记录全部（性能影响大，调试用）

// 索引使用情况统计
db.orders.aggregate([{ $indexStats: {} }]);`;

  const indexTuneCmd = `// 索引优化实战

// 1. 复合索引按 ESR 规则建
db.orders.createIndex({ userId: 1, status: 1, createdAt: -1 });
//   适用：find({ userId, status, createdAt:{$gte:...} }).sort({ createdAt:-1 })

// 2. 覆盖索引（Covered Query）
//   查询与投影字段全在索引中 → 不回表
db.orders.createIndex({ userId: 1, amount: 1 });
db.orders.find({ userId: 'u1' }, { _id: 0, amount: 1 });  // 走覆盖索引
//   executionStats.totalDocsExamined = 0 → 完美

// 3. 部分索引（Partial Index，3.2+）
//   只对满足条件的文档建索引，省空间
db.orders.createIndex(
  { userId: 1 },
  { partialFilterExpression: { status: 'PAID' } }    // 只索引已支付的
);

// 4. 稀疏索引（Sparse）
//   跳过无此字段的文档
db.users.createIndex({ phone: 1 }, { sparse: true });

// 5. 后台建索引（避免阻塞）
db.orders.createIndex({ amount: 1 }, { background: true });
//   4.2+ 默认就是非阻塞的在线构建

// 6. TTL 索引：自动过期
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
//   后台每 60s 清理一次过期文档

// 7. 文本索引：分词搜索
db.articles.createIndex({ title: 'text', content: 'text' });
db.articles.find({ $text: { $search: 'React 原理' } });
//   中文需要 Atlas Search 或第三方分词器

// 8. 删除冗余索引
db.orders.aggregate([{ $indexStats: {} }])
  .filter(i => i.accesses.ops === 0)   // 0 次访问的索引可考虑删除`;

  const tipsBox = ruleBox('warning',
    `<strong>聚合管道优化要点</strong>：<br>
    ① <strong>$match 尽早</strong>：放管道最前，先过滤再聚合，缩小后续处理量；<br>
    ② <strong>$project 减字段</strong>：尽早投影去掉大字段，减少中间数据；<br>
    ③ <strong>避免 $sort 大数据</strong>：100MB 以上排序会报错（需 <code>allowDiskUse:true</code>，但更慢）；用索引顺序代替；<br>
    ④ <strong>$lookup 谨慎</strong>：被关联字段必须有索引，否则全表扫描；<br>
    ⑤ <strong>$skip 深分页差</strong>：skip 10000 跳过 1w 条仍然要扫描，改游标分页（按 _id > last_id）；<br>
    ⑥ <strong>用 $facet 替代多次查询</strong>：分页 + 总数一次搞定；<br>
    ⑦ <strong>索引覆盖 $match/$sort/$project</strong>：复合索引按 ESR 设计能让这三步全走索引。`);

  return articleShell(t, `
    ${section('聚合管道的本质', conclusion)}
    ${section('常用 Stage 速查', stageTable)}
    ${section('$lookup：MongoDB 的 JOIN', codeBlock('MongoDB · $lookup 用法', 'dot-blue', 'javascript', lookupCmd))}
    ${section('$facet + $bucket：多结果并行 + 自动分桶', codeBlock('MongoDB · 分页与分桶', 'dot-orange', 'javascript', facetCmd))}
    ${section('$setWindowFields：窗口函数（5.0+）', codeBlock('MongoDB · 排名与累计', 'dot-green', 'javascript', windowCmd))}
    ${section('explain 与慢查询监控', codeBlock('MongoDB · 执行计划', 'dot-red', 'javascript', explainCmd))}
    ${section('索引优化实战', codeBlock('MongoDB · 索引调优', 'dot-blue', 'javascript', indexTuneCmd))}
    ${section('聚合管道优化要点', tipsBox)}`);
}
