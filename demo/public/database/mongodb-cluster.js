function renderMongodbCluster(t) {
  const conclusion = ruleBox('success',
    `MongoDB 高可用从<strong>副本集（Replica Set）</strong>到<strong>分片集群（Sharded Cluster）</strong>是渐进的两套方案：副本集解决<strong>高可用与读扩展</strong>（数据冗余 + 自动故障切换），分片集群在此基础上解决<strong>水平扩展</strong>（数据分散到多节点）。掌握副本集选举机制、读写分离、分片键选择、Chunk 迁移、4.0+ 多文档事务，是 MongoDB 生产部署的核心。`);

  const compareRows = [
    ['单节点',     '一个 mongod',                '开发测试',                       '❌ 无高可用',         '简单'],
    ['副本集',     '1 主 + N 从 + 仲裁（可选）', '生产标配，数据量 < 单机内存',     '✅ 自动故障切换',     '读写分离'],
    ['分片集群',   'mongos + config + shard',    '数据量 > 单机内存、超高 QPS',     '✅ 水平扩展',         '运维复杂、需选好分片键'],
  ];

  const compareTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">方案</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell frontend">适用</div>
        <div class="compare-card-header-cell desc">特点</div>
      </div>
      ${compareRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell frontend">${r[2]}</div>
        <div class="compare-card-cell desc">${r[4]}</div>
      </div>`).join('')}
    </div>`;

  const replicaHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">副本集架构与选举流程</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>        ┌── Primary ──┐
        │   可读可写     │
        └──────┬───────┘
               │ oplog 复制
       ┌───────┼───────┐
       ↓       ↓       ↓
   ┌── Secondary ──┐ ┌── Secondary ──┐ ┌── Arbiter ──┐
   │   只读         │ │   只读          │ │ 仅投票不存数据│
   └────────────────┘ └────────────────┘ └──────────────┘

故障切换流程（基于 Raft 协议变体）：
  1. Primary 心跳超时（默认 10s）→ Secondary 进入选举
  2. 各 Secondary 比较 oplog 时间戳：
     - oplog 最新的优先成为候选
     - priority 高的优先（可配置）
  3. 多数派投票通过 → 新 Primary 上任
  4. 客户端感知（通过 mongos 或驱动重连）
  5. 旧 Primary 恢复后变为 Secondary

选举必要条件：
  • 存活的节点数 > 总节点数 / 2（多数派）
  • 通常部署 3 节点（1 主 2 从）或 3 节点 + 1 仲裁

oplog（操作日志）：
  • 存在 local.oplog.rs 集合
  • 是 capped collection（固定大小）
  • Secondary 拉取 oplog 重放，类似 MySQL binlog
  • oplog 大小决定能容忍 Secondary 离线多久</code></pre>
    </div>`;

  const rwCmd = `// 读写分离：通过 readPreference 控制
// primary（默认）：所有读走主库，强一致
// primaryPreferred：优先主库，主挂才走从库
// secondary：所有读走从库
// secondaryPreferred：优先从库
// nearest：延迟最低的节点（不论主从）

// 连接字符串
mongodb://host1:27017,host2:27017,host3:27017/db?replicaSet=rs0&readPreference=secondaryPreferred

// Node.js 驱动
const client = new MongoClient(uri, {
  readPreference: 'secondaryPreferred',
  readConcernLevel: 'local'      // 读关注级别
});

// 写关注（Write Concern）：控制写入确认级别
db.orders.insertOne(doc, { writeConcern: { w: 'majority', j: true, wtimeout: 5000 } });
//   w: 1           → 主库写入即确认（可能丢）
//   w: 'majority'  → 多数节点写入确认（推荐）
//   w: 3           → 3 个节点确认
//   j: true        → 写入 journal 才确认（持久性最强）
//   wtimeout: 5000 → 5s 超时

// 读关注（Read Concern）：
//   'local'（默认）：读本地最新，可能未复制到多数
//   'majority'：读多数派已确认的数据
//   'linearizable'：线性一致性，读主库且等待多数派确认
//   'snapshot'：事务内快照读

// 生产推荐组合：
//   写：w:majority + j:true（强持久）
//   读：secondaryPreferred + local（高可用 + 性能）`;

  const shardHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">分片集群架构</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>   客户端
     │
     ↓
   ┌──────────────┐
   │   mongos     │  ← 路由层（无状态，可水平扩展）
   └──────┬───────┘
          │ 查询 config server 获取分片元数据
          ↓
   ┌──────────────────────┐
   │   Config Server      │  ← 元数据：分片键范围、Chunk 分布
   │   (3 节点副本集)      │
   └──────────────────────┘
          │
   ┌──────┴──────┬──────────┐
   ↓             ↓          ↓
┌────────┐  ┌────────┐  ┌────────┐
│Shard 1 │  │Shard 2 │  │Shard 3 │  ← 数据分片（每片是副本集）
│副本集   │  │副本集   │  │副本集   │
└────────┘  └────────┘  └────────┘

数据如何分片：
  1. 选定分片键（shard key），如 { userId: 1 }
  2. 分片键取值范围划分成 Chunk（默认 64MB 一个）
  3. Chunk 均匀分布到各 Shard
  4. mongos 根据分片键路由查询到对应 Shard

Chunk 迁移：
  • Config Server 监控各 Shard Chunk 数量
  • 不均衡超阈值 → balancer 自动迁移 Chunk
  • 迁移过程：源 Shard 复制到目标 → 切换元数据 → 删除源
  • 4.4+ 走 "merge" 机制，迁移更平滑</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">分片键是分片集群的灵魂</strong>——一旦确定无法更改（5.0 后支持 <code>refineCollectionShardKey</code> 添加后缀字段，但核心键不可换）。选错会导致：数据倾斜（某 Shard 持续过载）、jumbo chunk（无法迁移的超大 Chunk）、查询扇出（不带分片键的查询要广播所有 Shard）。
    </p>`;

  const shardKeyCmd = `// 分片键选择策略

// ❌ 自增 ID 作分片键
//   所有插入打到同一 Shard（最大值所在），无法水平扩展写入
sh.shardCollection('orders', { _id: 1 })        // 单调递增 → 热点

// ❌ 时间戳作分片键（同上原因）
sh.shardCollection('logs', { timestamp: 1 })    // 热点

// ✅ 哈希分片：散列均匀，适合等值查询
sh.shardCollection('orders', { userId: 'hashed' })
//   写入均匀分布，但不支持范围查询（路由失效需广播）

// ✅ 范围分片：适合范围查询，但可能倾斜
sh.shardCollection('orders', { userId: 1, createdAt: 1 })
//   复合分片键，前缀等值 + 后缀范围

// 分片键三大要求：
//   1. 基数高（取值多，能切成很多 Chunk）
//   2. 写分布均匀（避免热点）
//   3. 查询常用（带分片键的查询能精确路由）

// 经典选择：
//   - 用户中心：{ userId: 'hashed' }
//   - 时序日志：{ userId: 1, timestamp: 1 }（按用户分片，时间范围查）
//   - IoT 数据：{ sensorId: 1, timestamp: 1 }

// 5.0+ 可用 refineCollectionShardKey 追加字段（不改原键）
db.runCommand({
  refineCollectionShardKey: 'orders',
  key: { userId: 1, region: 1 }    // 在原 userId 基础上追加 region
});

// 查看分片状态
sh.status()
db.orders.getShardDistribution()    // 各 Shard 数据量`;

  const txCmd = `// 多文档事务（4.0+ 副本集，4.2+ 分片集群）

const session = client.startSession();
try {
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' }
  });

  // 转账：A 扣款 + B 加款，原子
  db.accounts.updateOne(
    { _id: 'A' },
    { $inc: { balance: -100 } },
    { session }
  );
  db.accounts.updateOne(
    { _id: 'B' },
    { $inc: { balance: 100 } },
    { session }
  );

  session.commitTransaction();
} catch (err) {
  session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}

// 事务限制：
//   • 默认 60s 超时（transactionLifetimeLimitSeconds）
//   • 单事务 16MB oplog 上限
//   • 分片集群事务需所有操作带分片键（4.2 限制，4.4 放宽）
//   • 性能损耗：单文档原子操作吞吐 vs 多文档事务，差 5~10 倍

// 设计原则：
//   1. 优先用单文档原子性（嵌入式文档 + $inc/$push）
//   2. 真正跨文档才用事务，且事务尽量短小
//   3. 不要把 MongoDB 当 MySQL 用，每条 SQL 都包事务

// 单文档原子操作（无需事务）：
db.orders.updateOne(
  { _id: 'order1' },
  {
    $set: { status: 'PAID' },
    $push: { logs: { action: 'paid', at: new Date() } },
    $inc: { version: 1 }
  }
);
// 嵌套文档 + 多操作符 → 单文档内多字段原子更新`;

  const trapBox = ruleBox('warning',
    `<strong>集群部署常见陷阱</strong>：<br>
    ① <strong>副本集只有 2 节点</strong>：无法形成多数派，主挂后不能自动选举。至少 3 节点或 2 节点 + 1 仲裁；<br>
    ② <strong>oplog 太小</strong>：Secondary 离线一段时间后 oplog 被覆盖 → 全量重同步。生产建议 5GB+；<br>
    ③ <strong>分片键选错</strong>：单调递增键导致热点；基数太低导致 Chunk 无法分裂；<br>
    ④ <strong>不带分片键的查询</strong>：mongos 需广播到所有 Shard（scatter-gather），性能差；<br>
    ⑤ <strong>jumbo chunk</strong>：Chunk 超过 64MB 无法迁移 → 数据倾斜。需手动 <code>splitVector</code> 或调大 chunkSize；<br>
    ⑥ <strong>事务滥用</strong>：把 MongoDB 当 MySQL 用，每条操作都开事务 → 性能断崖；<br>
    ⑦ <strong>读写分离读到的延迟</strong>：Secondary 复制有延迟，强一致读用 <code>readPreference=primary</code>。`);

  return articleShell(t, `
    ${section('MongoDB 高可用选型', conclusion)}
    ${section('部署方案对比', compareTable)}
    ${section('副本集：选举与 oplog', `<div class="section-body">${replicaHtml}</div>`)}
    ${section('读写分离：readPreference / Write Concern', codeBlock('MongoDB · 读写控制', 'dot-blue', 'javascript', rwCmd))}
    ${section('分片集群：mongos + config + shard', `<div class="section-body">${shardHtml}</div>`)}
    ${section('分片键：选错万劫不复', codeBlock('MongoDB · 分片键策略', 'dot-orange', 'javascript', shardKeyCmd))}
    ${section('多文档事务（4.0+）', codeBlock('MongoDB · 事务与原子操作', 'dot-red', 'javascript', txCmd))}
    ${section('集群部署陷阱', trapBox)}`);
}
