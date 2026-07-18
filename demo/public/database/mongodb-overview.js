function renderMongodbOverview(t) {
  const conclusion = ruleBox('success',
    `MongoDB 是最流行的<strong>文档型 NoSQL 数据库</strong>，以 BSON（二进制 JSON）格式存储数据，<strong>Schema-Free</strong>——同一集合内的文档可以拥有完全不同的字段。凭借灵活的数据模型、原生水平扩展（分片）与高性能聚合管道，MongoDB 在<strong>内容管理、用户画像、IoT 日志、实时分析</strong>等"字段不固定、嵌套层级深、迭代频繁"的场景中优势显著，是前端工程师最易上手的数据库——因为你存的就是 JSON。`);

  const scenariosHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">📝</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">内容管理 / CMS</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          文章、评论、标签、作者信息天然是<strong style="color:var(--text-primary)">嵌套结构</strong>。MongoDB 一篇文档即可存整篇文章 + 嵌套评论，无需 MySQL 那种"文章表 + 评论表 + 标签关联表"三表 JOIN。字段变更（加个"封面图"字段）直接写入，无需 ALTER TABLE。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">👤</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">用户画像 / Profile</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          不同用户的属性差异巨大——A 用户有"工作经历"数组，B 用户只有基础信息。<strong style="color:var(--text-primary)">Schema-Free</strong> 让每个用户文档独立演进，避免了 MySQL 中大量稀疏列或 EAV 模型的尴尬。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">📦</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">IoT / 日志采集</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          设备上报数据字段不统一、写入量大、按时间查询为主。MongoDB 的<strong style="color:var(--text-primary)">Capped Collection</strong>（固定大小集合）+ TTL 索引天然适合日志轮转，分片集群支撑 TB 级写入。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🎮</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">游戏 / 实时配置</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          游戏角色装备、技能树、关卡配置等结构复杂且频繁迭代。MongoDB 的嵌套文档 + 数组直接对应游戏数据结构，策划改配置无需走 DBA 流程，敏捷迭代友好。
        </div>
      </div>
    </div>`;

  const stackRows = [
    ['Database → Collection → Document', 'DB → Table → Row',        'MongoDB 用集合（Collection）存文档（Document），对应 MySQL 的表/行'],
    ['BSON 文档（嵌套 JSON）',            '扁平行 + JOIN',            '一篇文章 + 评论可存一个文档；MySQL 需多表关联'],
    ['Schema-Free（字段可变）',            'Schema 严格（ALTER TABLE）', 'MongoDB 字段随时增减；MySQL 改字段需 DDL，大表代价高'],
    ['_id（默认 ObjectId）',              '主键（自增 ID）',           'ObjectId 含时间戳，天然有序且分布式友好'],
    ['Aggregation Pipeline',             'GROUP BY + 子查询',         'MongoDB 管道式聚合，阶段化处理，类比 JS 数组链式调用'],
    ['分片（Shard）水平扩展',             '分库分表（中间件）',        'MongoDB 原生支持；MySQL 需 ShardingSphere 等中间件'],
    ['副本集（Replica Set）',             '主从复制',                  'MongoDB 自带选举机制；MySQL 需 MHA / Orchestrator'],
    ['Mongo Shell / Mongoose',           'SQL / Prisma',              'MongoDB 用 JS 语法操作，前端工程师零学习成本'],
  ];

  const stackTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">MongoDB 概念</div>
        <div class="compare-card-header-cell frontend">MySQL / 前端对应</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${stackRows.map(([db, fe, desc]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${db}</div>
        <div class="compare-card-cell frontend">${fe}</div>
        <div class="compare-card-cell desc">${desc}</div>
      </div>`).join('')}
    </div>`;

  const bsonBox = ruleBox('info',
    `<strong>BSON（Binary JSON）</strong>：MongoDB 的存储格式，比 JSON 多支持 <code>Date</code>、<code>ObjectId</code>、<code>BinData</code>、<code>Decimal128</code> 等类型，并按字段长度编码以加速跳过。对开发者而言操作起来就是 JSON——前端 <code>fetch</code> 拿到的对象结构几乎可以直接存进 MongoDB，无需 ORM 转换层。文档最大 <strong>16MB</strong>，超过应拆分或用 GridFS。`);

  const schemaFreeBox = ruleBox('success',
    `<strong>Schema-Free 的代价</strong>：灵活不等于无纪律。<strong>优点</strong>：字段变更无需 DDL，敏捷迭代；不同实体可共存一个集合。<strong>风险</strong>：字段名拼写错误、类型不一致会在查询时才暴露。生产实践通常用 <code>Mongoose</code>（Node.js）或 <code>Bean Validation</code>（Java）在应用层做 Schema 约束，结合 MongoDB 3.2+ 的 <code>$jsonSchema</code> 校验器做底层兜底。`);

  const crudCmd = `// 插入：直接存 JSON 对象，无需预定义表结构
db.users.insertOne({
  name: 'Phil',
  age: 30,
  tags: ['react', 'node'],
  address: { city: '杭州', zip: '310000' },
  createdAt: new Date()
});

// 查询：MongoDB 的查询语法 ≈ JS 对象，前端零学习成本
db.users.find({
  'address.city': '杭州',         // 嵌套字段用点号
  age: { $gte: 18, $lt: 60 },     // 范围查询
  tags: 'react'                    // 数组包含
}).sort({ createdAt: -1 }).limit(10);

// 更新：原子操作符，避免读-改-写竞态
db.users.updateOne(
  { _id: ObjectId('...') },
  { $set: { age: 31 },
    $push: { tags: 'rust' } }       // $push 数组追加，$inc 自增
);

// 索引：与 MySQL 类似，建在常用查询字段
db.users.createIndex({ 'address.city': 1, age: -1 });`;

  const aggCmd = `// 聚合管道：阶段化处理，类比 JS 数组的 map/filter/reduce
db.orders.aggregate([
  // $match  → 相当于 WHERE
  { $match: { status: 'PAID', createdAt: { $gte: ISODate('2026-01-01') } } },
  // $group  → 相当于 GROUP BY + 聚合函数
  { $group: {
      _id: '$userId',                // 按用户分组
      totalAmount: { $sum: '$amount' },
      orderCount: { $sum: 1 },
      avgAmount: { $avg: '$amount' }
  } },
  // $sort   → 排序
  { $sort: { totalAmount: -1 } },
  // $limit  → 限制结果数
  { $limit: 10 },
  // $lookup → 左外连接（相当于 LEFT JOIN）
  { $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'userInfo'
  } }
]);`;

  const replCmd = `# 副本集（Replica Set）：1 主 + N 从，自动故障转移
# 启动 3 个节点
mongod --replSet rs0 --port 27017 --dbpath /data/rs0-1
mongod --replSet rs0 --port 27018 --dbpath /data/rs0-2
mongod --replSet rs0 --port 27019 --dbpath /data/rs0-3

# 在主节点初始化
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'localhost:27017' },  // Primary
    { _id: 1, host: 'localhost:27018' },  // Secondary
    { _id: 2, host: 'localhost:27019', arbiterOnly: true }  // 仲裁节点
  ]
});

# 主节点宕机 → 从节点自动选举新主（通常 < 10s）
# 写入默认走主节点，读取可指定从节点（readPreference=secondary）`;

  const notForHtml = `
    <p>MongoDB 不擅长或需要谨慎使用的场景：</p>
    <ul>
      <li><strong>强关系型数据</strong>：银行账务、ERP 等表与表强关联且需多表 JOIN 的场景，MySQL 的事务与外键更可靠</li>
      <li><strong>跨文档强事务</strong>：4.0 起支持多文档事务，但性能损耗明显，跨集合事务仍应尽量避免——设计时优先嵌入式文档</li>
      <li><strong>高频小事务 OLTP</strong>：单文档操作原子性强，但跨文档场景下 MySQL 的行锁与隔离级别更成熟</li>
      <li><strong>极低延迟缓存</strong>：磁盘 + 内存映射文件（WiredTiger）延迟不及 Redis 的纯内存模型，热点缓存仍应用 Redis</li>
      <li><strong>列式 OLAP 分析</strong>：聚合管道虽强，但海量数据下的扫描分析仍应交给 ClickHouse / Doris 这类列式引擎</li>
      <li><strong>金融级数据零丢失</strong>：写入默认 ack 可调，但与 MySQL 双 1 + binlog 复制相比，金融场景需更严格配置与多副本确认</li>
    </ul>`;

  return articleShell(t, `
    ${section('MongoDB 是什么', conclusion)}
    ${section('主要应用场景', scenariosHtml)}
    ${section('MongoDB vs MySQL / 前端存储', stackTable)}
    ${section('核心概念：BSON 文档模型', bsonBox)}
    ${section('核心概念：Schema-Free 的权衡', schemaFreeBox)}
    ${section('CRUD 实战：前端零学习成本', codeBlock('MongoDB Shell · CRUD 与索引', 'dot-green', 'javascript', crudCmd))}
    ${section('聚合管道：阶段化数据处理', codeBlock('MongoDB · Aggregation Pipeline', 'dot-blue', 'javascript', aggCmd))}
    ${section('副本集：自动故障转移', codeBlock('MongoDB · Replica Set 配置', 'dot-yellow', 'shell', replCmd))}
    ${section('MongoDB 不擅长的领域', `<div class="section-body">${notForHtml}</div>`)}`);
}
