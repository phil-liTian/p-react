function renderPgReplication(t) {
  const conclusion = ruleBox('info',
    `PostgreSQL 的复制体系从<strong>流复制（物理复制）</strong>到<strong>逻辑复制</strong>是双轨制：流复制是<strong>块级同步</strong>，主备完全一致，用于高可用与读写分离；逻辑复制是<strong>表级订阅</strong>，可跨版本、跨平台、选择性同步，用于数据集成与升级。理解这两套机制、Patroni 高可用方案、跨版本升级路径，是 PostgreSQL 生产部署的核心。`);

  const compareRows = [
    ['流复制',      '物理（WAL 块级）',  '主备完全一致',         '高可用、读写分离、容灾',           '同版本、同架构'],
    ['逻辑复制',    '逻辑（表级 SQL）',  '选择表订阅',           '跨版本升级、数据集成、多活',       'DDL 不自动同步、无序列'],
    ['第三方工具',  'pglogical / Bucardo', '增强逻辑复制',         '双向同步、复杂冲突解决',           '运维复杂，已较少使用'],
  ];

  const compareTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">方案</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell desc">限制</div>
      </div>
      ${compareRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[4]}</div>
      </div>`).join('')}
    </div>`;

  const streamingHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">流复制架构</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>┌──────── Primary ────────┐              ┌──────── Standby ────────┐
│                         │              │                         │
│  ① 事务执行              │              │                         │
│         ↓               │              │                         │
│  ② 写 WAL（Write-Ahead  │   ③ WAL      │  ④ WAL Receiver 接收    │
│     Log，预写日志）       │ ──────────→  │         ↓               │
│         ↓               │   TCP 流式    │  ⑤ 写本地 WAL 文件       │
│  ③ WAL Sender 推送       │              │         ↓               │
│         ↓               │              │  ⑥ Redo 进程重放         │
│  ④ 数据页延迟刷盘         │              │         ↓               │
│                         │              │  ⑦ 数据更新到备库         │
└─────────────────────────┘              └─────────────────────────┘

WAL（Write-Ahead Log）：
  • 类似 MySQL 的 redo log，记录所有数据变更
  • 流复制本质是主库实时推送 WAL 给备库
  • 备库重放 WAL，达到与主库一致

同步模式（synchronous_commit）：
  • off / local / remote_write / remote_flush / remote_apply
  • remote_flush：主库等备库把 WAL 刷盘后才返回客户端
  • remote_apply：备库重放完才返回（最强一致）</code></pre>
    </div>`;

  const streamingCmd = `# 流复制配置

# ── 主库 postgresql.conf ──
wal_level = replica                  # 必须为 replica 或 logical
max_wal_senders = 10                 # WAL Sender 数量
max_replication_slots = 10           # 复制槽数（防备库断线丢 WAL）
synchronous_commit = remote_flush    # 同步模式
synchronous_standby_names = 'standby1'   # 同步备库名

# ── 主库 pg_hba.conf：允许备库连接 ──
host replication replicator 192.168.1.0/24 md5

# ── 主库：创建复制用户 ──
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'xxx';

# ── 备库：用 pg_basepackup 初始化 ──
pg_basebackup -h primary -U replicator -D /var/lib/postgresql/data -P -R
#   -R 自动创建 standby.signal 和 primary_conninfo

# ── 备库 postgresql.conf ──
hot_standby = on                     # 备库可读
# primary_conninfo 由 pg_basebackup -R 自动写入

# ── 查看复制状态（主库）──
SELECT * FROM pg_stat_replication;
#   application_name / client_addr / state / sync_state
#   sent_lsn / write_lsn / flush_lsn / replay_lsn

# ── 查看复制状态（备库）──
SELECT * FROM pg_stat_wal_receiver;
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;

# ── 同步级别 vs 一致性 ──
#   async（异步）：主库不等备库 → 性能高但可能丢数据
#   sync（同步）：主库等备库 ACK → 强一致但延迟敏感
#   quorum：要求 N 个备库确认（PG 10+）

# ── 复制槽（Replication Slot）──
#   防止备库断线时主库清理 WAL
SELECT * FROM pg_replication_slots;
#   注意：备库长期断线会导致主库 WAL 堆积！监控 active 字段`;

  const logicalCmd = `-- 逻辑复制（10+）：表级订阅，跨版本

-- ── 发布端（Publisher）──
-- postgresql.conf
-- wal_level = logical
-- max_replication_slots = 10
-- max_wal_senders = 10

-- 创建发布
CREATE PUBLICATION pub_orders FOR TABLE orders;
CREATE PUBLICATION pub_all FOR ALL TABLES;          -- 全库发布

-- 仅发布 INSERT/UPDATE/DELETE（默认全部）
CREATE PUBLICATION pub_orders FOR TABLE orders
  WITH (publish = 'insert,update');                 -- 不发 DELETE

-- ── 订阅端（Subscriber）──
-- 必须先建好表结构（DDL 不自动同步！）
CREATE TABLE orders (...);     -- 与发布端一致

-- 创建订阅
CREATE SUBSCRIPTION sub_orders
  CONNECTION 'host=primary port=5432 user=replicator password=xxx dbname=sourcedb'
  PUBLICATION pub_orders;

-- 仅订阅部分表
CREATE SUBSCRIPTION sub_orders
  CONNECTION '...'
  PUBLICATION pub_orders
  WITH (copy_data = true,   -- 初始同步全表数据
        create_slot = true);

-- ── 管理命令 ──
SELECT * FROM pg_publication;        -- 发布端查看
SELECT * FROM pg_subscription;       -- 订阅端查看
SELECT * FROM pg_stat_subscription;  -- 订阅状态

-- 暂停 / 恢复
ALTER SUBSCRIPTION sub_orders DISABLE;
ALTER SUBSCRIPTION sub_orders ENABLE;

-- 删除订阅（不会删表）
DROP SUBSCRIPTION sub_orders;

-- 逻辑复制限制：
--   1. DDL 不自动同步（CREATE/ALTER 需手动）
--   2. 序列（SEQUENCE）不复制 → 订阅端需手动 setval
--   3. TRUNCATE 默认复制（可关闭）
--   4. 大对象（LOB）不复制
--   5. 同一行并发更新可能冲突 → 用 pglogical 解决`;

  const haRows = [
    ['Patroni',           'etcd/ZooKeeper/Consul + Patroni', '主从切换 + 自动 failover', '生产首选，Spilo、 crunchy-pgo 等'],
    ['pgpool-II',         'pgpool 中间件',                    '连接池 + 负载均衡 + HA',   '功能多但配置复杂'],
    ['repmgr',            'repmgr 守护进程',                  '主从管理 + 见证节点',       '老牌方案，逐步被 Patroni 替代'],
    ['Stolon',            'etcd + Stolon keeper',             '类 Patroni，K8s 友好',     'K8s 部署可用'],
    ['Crunchy Data PGO',  'Operator + Patroni',                'K8s 原生 PG Operator',     '云原生方案'],
  ];

  const haTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">方案</div>
        <div class="compare-card-header-cell frontend">依赖</div>
        <div class="compare-card-header-cell desc">特点</div>
      </div>
      ${haRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[3]}</div>
      </div>`).join('')}
    </div>`;

  const patroniCmd = `# Patroni：生产首选的 PostgreSQL 高可用方案

# ── 架构 ──
#   etcd (3 节点) ← 存储集群元数据 + 选主
#        ↑
#   Patroni (每台 PG 节点一个)
#        ↓
#   PostgreSQL (主 + N 备)
#        ↑
#   HAProxy / Keepalived → 客户端 VIP

# ── patroni.yml ──
scope: pg-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: 192.168.1.1:8008

etcd:
  hosts: 192.168.1.10:2379,192.168.1.11:2379,192.168.1.12:2379

bootstrap:
  dcs:
    ttl: 30
    synchronous_mode: true            # 同步模式
    postgresql:
      parameters:
        wal_level: replica
        max_wal_senders: 10
        synchronous_commit: "remote_flush"

postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/data
  bin_dir: /usr/lib/postgresql/14/bin
  authentication:
    replication:
      username: replicator
      password: xxx
    superuser:
      username: postgres
      password: xxx

# ── 启动 ──
patroni /etc/patroni/patroni.yml

# ── 故障切换流程 ──
#   1. 主库 Patroni 失去 etcd 租约（30s TTL）
#   2. 各备库 Patroni 抢锁 → 选出 WAL 最新的备库为新主
#   3. HAProxy 健康检查自动切流量
#   4. 旧主恢复后自动加入为备库

# ── 手动切换（运维）──
patronictl switchover --cluster pg-cluster
patronictl failover --cluster pg-cluster --candidate node2

# ── 查看集群状态 ──
patronictl list
#   Cluster  Member  Role    State    TL  Lag in MB
#   pg-cluster  node1  Leader  Leader   10  0
#   pg-cluster  node2  Replica Stream   10  0
#   pg-cluster  node3  Replica Stream   10  0`;

  const upgradeHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">跨版本升级方案</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>三种升级路径：

1. pg_upgrade（原地升级，停机）
   • 停服 → pg_upgrade 转换数据目录 → 启新版本
   • 适合：能接受 30 分钟~数小时停机
   • 大表数据多时升级时间长

2. 逻辑复制（在线升级，零停机）
   • 新版本作为订阅端连旧版本
   • 数据同步追平后切换流量
   • 适合：核心业务不能停机
   • 限制：DDL 不自动同步，需手动维护

3. 流复制 + pg_rewind（主备切换升级）
   • 升备库 → 主备切换 → 升旧主
   • 仅相邻版本可行
   • 升级期间需要短暂停服

典型场景：
  • 小版本升级（14.5 → 14.8）：apt/yum 升级包 + 重启
  • 大版本升级（13 → 15）：逻辑复制在线升级
  • 紧急升级（安全补丁）：pg_upgrade --link（硬链接，秒级）</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">升级前必做</strong>：① 备份；② 测试环境验证应用兼容性；③ 阅读 Release Notes 的 Breaking Changes；④ 检查扩展插件是否支持新版本（PostGIS、pg_vector 等通常滞后于 PG 主版本）。
    </p>`;

  const trapBox = ruleBox('warning',
    `<strong>复制与高可用常见陷阱</strong>：<br>
    ① <strong>异步复制丢数据</strong>：主库提交后未同步到备库即宕机 → 丢数据。强一致场景用 <code>synchronous_commit=remote_flush</code>。<br>
    ② <strong>复制槽未清理</strong>：备库长期断线 → WAL 在主库无限堆积 → 磁盘满。监控并清理 inactive slot。<br>
    ③ <strong>备库查询阻塞重放</strong>：备库有长查询时，重放会被阻塞 → 复制延迟。设 <code>max_standby_streaming_delay</code>。<br>
    ④ <strong>逻辑复制 DDL 漏同步</strong>：发布端加字段后订阅端没加 → 复制中断。需配套 DDL 同步流程。<br>
    ⑤ <strong>序列冲突</strong>：逻辑复制不传序列，订阅端 ID 冲突。订阅后立即 <code>setval</code>。<br>
    ⑥ <strong>Patroni 脑裂</strong>：etcd 分区时两个节点都认为自己是主。配置 <code>synchronous_mode</code> + 多数派 etcd。<br>
    ⑦ <strong>HAProxy 健康检查误判</strong>：用 <code>/read-only</code> 端点区分主备，避免写打到备库。<br>
    ⑧ <strong>升级跨大版本未测试扩展</strong>：PostGIS、pg_vector 等扩展在新版本可能滞后数月。`);

  return articleShell(t, `
    ${section('PostgreSQL 复制体系', conclusion)}
    ${section('流复制 vs 逻辑复制', compareTable)}
    ${section('流复制：WAL 物理同步', `<div class="section-body">${streamingHtml}</div>`)}
    ${section('流复制配置实战', codeBlock('PostgreSQL · 流复制', 'dot-blue', 'shell', streamingCmd))}
    ${section('逻辑复制：表级订阅', codeBlock('PostgreSQL · 逻辑复制', 'dot-green', 'sql', logicalCmd))}
    ${section('高可用方案对比', haTable)}
    ${section('Patroni：生产首选', codeBlock('Patroni · 配置与运维', 'dot-orange', 'yaml', patroniCmd))}
    ${section('跨版本升级方案', `<div class="section-body">${upgradeHtml}</div>`)}
    ${section('复制与高可用陷阱', trapBox)}`);
}
