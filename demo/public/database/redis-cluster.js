function renderRedisCluster(t) {
  const conclusion = ruleBox('danger',
    `Redis 高可用从<strong>主从复制</strong>（数据冗余）→ <strong>哨兵 Sentinel</strong>（自动故障切换）→ <strong>Cluster</strong>（分片 + 高可用一体）逐步演进。选型很简单：数据量 &lt; 单机内存用<strong>哨兵</strong>；数据量超单机内存或 QPS 极高用 <strong>Cluster</strong>。理解这三套方案的差异、故障切换流程、数据分片规则，是 Redis 生产部署的必经之路。`);

  const compareRows = [
    ['主从复制',   '主写从读，异步复制',           '数据冗余 / 读写分离',         '❌ 主挂需手动切换',         '简单，无自动切换'],
    ['哨兵 Sentinel', '主从 + 哨兵监控',            '中等规模高可用',              '✅ 自动选举新主',           '单机容量瓶颈'],
    ['Cluster',    '分片 + 节点间 gossip',         '大数据量 / 高 QPS',           '✅ 节点自动故障切换',       '运维复杂、跨 slot 限制'],
    ['Codis / Twemproxy', '代理层分片',            '历史方案（已较少使用）',      '⚠ 需借助外部高可用',        '透明客户端，但中间层瓶颈'],
    ['Redisson 单机',  '客户端内置哨兵',            'Java 应用单实例',             '✅ 客户端故障切换',         '仅 Java 生态'],
  ];

  const compareTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">方案</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell frontend">适用规模</div>
        <div class="compare-card-header-cell frontend">自动切换</div>
        <div class="compare-card-header-cell desc">权衡</div>
      </div>
      ${compareRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell frontend">${r[2]}</div>
        <div class="compare-card-cell frontend">${r[3]}</div>
        <div class="compare-card-cell desc">${r[4]}</div>
      </div>`).join('')}
    </div>`;

  const masterSlaveHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">主从复制流程</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>┌──────── Master ────────┐              ┌──────── Slave ────────┐
│                        │              │                        │
│  ① 写命令执行           │              │                        │
│         ↓              │              │                        │
│  ② 写命令传播给 Slave    │  ③ SYNC/PSYNC │  ④ 接收命令           │
│         ↓              │ ──────────→  │         ↓              │
│  ③ 命令写入 backlog     │   TCP 传播    │  ⑤ 应用到本地数据       │
│         ↓              │              │         ↓              │
│  ④ 命令入队 reply       │              │  ⑥ 数据同步             │
│                        │              │                        │
└────────────────────────┘              └────────────────────────┘

全量同步（首次 / 断线太久）：
  1. Slave 发 PSYNC ? -1
  2. Master 执行 BGSAVE 生成 RDB
  3. Master 发送 RDB 给 Slave
  4. Slave 加载 RDB
  5. Master 把同步期间的增量命令发给 Slave

增量同步（短暂断线）：
  1. Slave 发 PSYNC <runid> <offset>
  2. Master 检查 offset 在 repl_backlog 内 → 发送缺失部分
  3. 否则降级为全量同步</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">repl_backlog_size</strong> 是增量同步的关键——默认 1MB，生产建议调到 100MB+，避免短暂断线触发全量同步（全量同步对大实例是灾难：BGSAVE fork 阻塞 + RDB 传输耗带宽 + Slave 加载阻塞）。
    </p>`;

  const sentinelHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">Sentinel 故障切换流程</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>部署：3+ 哨兵节点（奇数，避免脑裂）独立部署，监控同一组 Master/Slave

         ┌── Sentinel 1 ──┐
         │                  │
         ├── Sentinel 2 ──┤  ← 互相通信 + 监控 Master
         │                  │
         └── Sentinel 3 ──┘
                 │
                 ↓
         ┌── Master ──┐    ┌── Slave 1 ──┐    ┌── Slave 2 ──┐
         │            │    │             │    │             │
         └────────────┘    └─────────────┘    └─────────────┘

故障切换：
  1. 哨兵们通过 PING/PONG 心跳发现 Master 超时（down-after-millisecond）
  2. 主观下线（SDOWN）→ 询问其他哨兵确认 → 客观下线（ODOWN）
  3. 选举 Leader 哨兵（Raft）
  4. Leader 选最优 Slave 提升为新 Master：
     - 优先级 slave-priority 最高
     - 复制偏移量最大（数据最新）
     - runid 最小
  5. 通知其他 Slave 改连新 Master
  6. 通知客户端（通过 pub/sub）
  7. 旧 Master 恢复后变 Slave</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">客户端感知故障切换</strong>：客户端连哨兵查询 Master 地址，故障时哨兵推新地址。Java 用 Jedis/Lettuce 内置支持，Spring Boot 配 <code>spring.redis.sentinel</code> 即可。
    </p>`;

  const clusterHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">Cluster 数据分片：16384 个 slot</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code># Cluster 把所有 key 分到 16384 个 slot
# slot = CRC16(key) mod 16384
# 每个 Master 节点负责一段 slot 区间

# 3 主 3 从的典型部署（slot 均分）：
#   Master A (slot 0-5460)      ← Slave A'
#   Master B (slot 5461-10922)  ← Slave B'
#   Master C (slot 10923-16383) ← Slave C'

# 路由：客户端根据 slot 找节点
SET k1 v1
# CRC16("k1") mod 16384 = 12345
# 12345 在 Master C 范围 → 转发到 Master C
# 客户端 SDK 缓存 slot 路由表，重定向时刷新

# MOVED 重定向：key 不在当前节点
#   -c 模式自动跟随：redis-cli -c
#   客户端 SDK 自动处理

# ASK 重定向：slot 正在迁移中
#   临时重定向，客户端不缓存

# Hash Tag：强制多个 key 同 slot（支持批量操作）
SET {user:1001}:profile ...   # 大括号内参与 hash
SET {user:1001}:orders ...
MGET {user:1001}:profile {user:1001}:orders   # 同 slot 可批量</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">为什么是 16384 个 slot？</strong>Redis 作者 antirez 解释：① 心跳包大小合适（8KB 能装下 16384 bit 的 slot 位图）；② 集群节点数上限 1000，16384 远大于此；③ CRC16 在 16384 内分布均匀。
    </p>`;

  const failoverCmd = `# Cluster 节点故障切换
# 当某 Master 故障，其 Slave 自动被提升为新 Master

# 查看集群状态
redis-cli -c -p 7000 cluster nodes
# 显示每个节点的 id / ip:port / 角色 / slot 范围 / 主从关系 / 状态

# CLUSTER INFO 看集群整体状态
CLUSTER INFO
# cluster_state:ok           ← 全部正常
# cluster_slots_assigned:16384
# cluster_slots_ok:16384

# 手动故障切换（运维场景，如升级 Master）
redis-cli -p 7004 cluster failover    # 7004 是 Slave
# 流程：Slave 通知 Master 停止写入 → 同步完 → Slave 提升为主 → 旧 Master 变 Slave

# 扩容：新增节点并迁移 slot
redis-cli --cluster add-node 127.0.0.1:7007 127.0.0.1:7000  # 加入集群
redis-cli --cluster reshard 127.0.0.1:7000                   # 迁移 slot
# 迁移过程：逐 key 迁移（MIGRATE 命令），影响在线业务但可控

# 缩容：先迁移走 slot 再下线节点
redis-cli --cluster reshard 127.0.0.1:7000  # 把要下线节点的 slot 迁走
redis-cli --cluster del-node 127.0.0.1:7000 <node-id>`;

  const crossDcHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px">跨数据中心同步方案</div>
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
        <strong style="color:var(--text-primary)">① 主从复制（单方向）</strong>：A 机房主 → B 机房从，B 只读。延迟低但 B 不能写，A 机房挂需要人工切换。<br><br>
        <strong style="color:var(--text-primary)">② 双主互备（双向复制）</strong>：A、B 互为主从。需要解决循环复制——Redis 不直接支持，需业务层去重或借助中间件（redis-shake）。<br><br>
        <strong style="color:var(--text-primary)">③ redis-shake</strong>：阿里开源的 Redis 数据同步工具，支持跨版本、跨机房同步。常用于迁移、容灾。<br><br>
        <strong style="color:var(--text-primary)">④ 业务层多写</strong>：写操作同时写两个机房的 Redis，弱一致但简单。<br><br>
        <strong style="color:var(--text-primary)">⑤ 异地多活</strong>：单元化部署（蚂蚁 LDC、饿了么 EMS），按用户分流到不同单元，每个单元独立 Redis，跨单元走消息异步同步。
      </div>
    </div>`;

  const trapBox = ruleBox('warning',
    `<strong>集群方案的几个坑</strong>：<br>
    ① <strong>Cluster 跨 slot 操作报错</strong>：<code>MGET k1 k2</code> 若 k1、k2 不在同一 slot 直接报错。用 Hash Tag <code>{user:1001}:profile</code> 强制同 slot。<br>
    ② <strong>事务 / Lua 跨 slot 失效</strong>：MULTI/EXEC、Lua 脚本操作的 key 必须同 slot。<br>
    ③ <strong>哨兵脑裂</strong>：网络分区时两个哨兵组各选一个 Master，写入冲突。配置 <code>min-slaves-to-write</code> 主库至少有 N 个从库才允许写。<br>
    ④ <strong>Cluster 不支持多 DB</strong>：只能用 DB 0。<br>
    ⑤ <strong>大 Key 迁移阻塞</strong>：MIGRATE 大 key 会阻塞源节点，需先拆分。<br>
    ⑥ <strong>主从切换丢数据</strong>：异步复制下，Master 切换瞬间未同步的写会丢。强一致场景用 WAIT 命令等待 N 个从库 ACK。`);

  return articleShell(t, `
    ${section('高可用方案选型', conclusion)}
    ${section('方案对比总览', compareTable)}
    ${section('主从复制：全量 + 增量同步', `<div class="section-body">${masterSlaveHtml}</div>`)}
    ${section('哨兵 Sentinel：自动故障切换', `<div class="section-body">${sentinelHtml}</div>`)}
    ${section('Cluster：16384 slot 分片', `<div class="section-body">${clusterHtml}</div>`)}
    ${section('Cluster 运维：故障切换与扩缩容', codeBlock('Redis · Cluster 运维命令', 'dot-orange', 'shell', failoverCmd))}
    ${section('跨数据中心同步', `<div class="section-body">${crossDcHtml}</div>`)}
    ${section('集群方案常见陷阱', trapBox)}`);
}
