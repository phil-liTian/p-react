function renderMysqlReplication(t) {
  const conclusion = ruleBox('accent',
    `MySQL 主从复制是<strong>高可用与读写分离的基础</strong>——主库写 binlog，从库拉取并重放，让多个数据副本保持一致。在此基础上构建出 <strong>读写分离</strong>（主写从读）、<strong>故障切换</strong>（主挂切从）、<strong>异地容灾</strong>（跨机房复制）、<strong>实时数仓同步</strong>（订阅 binlog 到 Kafka）。理解复制原理就理解了"为什么主从会有延迟"、"为什么半同步比异步可靠"、"为什么 MGR 是未来"。`);

  const binlogHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">binlog vs redo log：两种日志的区别</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="color:var(--text-secondary);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px">维度</th>
            <th style="text-align:left;padding:6px 8px">redo log（InnoDB）</th>
            <th style="text-align:left;padding:6px 8px">binlog（Server 层）</th>
          </tr>
        </thead>
        <tbody style="color:var(--text-secondary)">
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">层级</td><td>存储引擎层</td><td>Server 层（所有引擎共用）</td></tr>
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">作用</td><td>崩溃恢复（持久性）</td><td>复制 + 数据归档</td></tr>
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">内容</td><td>物理日志（"哪个页偏移改成什么"）</td><td>逻辑日志（"执行了什么 SQL / 行变更"）</td></tr>
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">写入时机</td><td>事务进行中持续写</td><td>事务提交后写</td></tr>
          <tr><td style="padding:6px 8px">写入方式</td><td>循环覆盖（环形文件）</td><td>追加写入（达到大小切新文件）</td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">两阶段提交（2PC）</strong>：为保证 redo log 与 binlog 一致，MySQL 采用 <code>prepare redo log → write binlog → commit redo log</code>。崩溃恢复时若 redo log 已 commit 则直接恢复；若处于 prepare 状态则查 binlog 是否完整——完整则 commit、不完整则回滚。
    </p>`;

  const flowHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">异步复制流程（默认）</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>   ┌──────── Master ────────┐              ┌──────── Slave ────────┐
   │                        │              │                        │
   │  ① 事务执行 → 写数据    │              │                        │
   │         ↓              │              │                        │
   │  ② 写 redo log（prepare）│              │                        │
   │         ↓              │              │                        │
   │  ③ 写 binlog           │  ④ IO 线程   │  ④ IO 线程拉取 binlog   │
   │         ↓              │ ←──────────  │         ↓              │
   │  ④ 提交 redo log       │   TCP 拉取   │  ⑤ 写 relay log        │
   │         ↓              │              │         ↓              │
   │  ⑤ 返回客户端 "OK"     │              │  ⑥ SQL 线程重放 SQL     │
   │                        │              │         ↓              │
   │                        │              │  ⑦ 数据更新到从库       │
   └────────────────────────┘              └────────────────────────┘

关键点：
  • 主库不等待从库 ACK 即返回客户端（异步）
  • 从库两个线程：IO 线程拉日志、SQL 线程重放
  • 5.7+ 支持并行复制（基于组提交 / WRITESET），缓解延迟</code></pre>
    </div>`;

  const modesRows = [
    ['异步复制',   'ASYNC',           '主库不等从库 ACK', '默认；性能最高但可能丢数据', '互联网非核心业务'],
    ['半同步复制', 'SEMI-SYNC',       '至少一个从库 ACK', '性能略降；保证不丢',         '金融、订单等核心业务'],
    ['全同步复制', 'SYNC (Group Replication)', '所有节点 ACK', '强一致；性能最低',  'MGR / 分布式数据库'],
  ];

  const modesTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">模式</div>
        <div class="compare-card-header-cell frontend">SQL 名</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell desc">权衡</div>
      </div>
      ${modesRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell frontend">${r[2]}</div>
        <div class="compare-card-cell desc">${r[3]}</div>
      </div>`).join('')}
    </div>`;

  const delaySql = `-- 主从延迟的原因：
--   1. 主库并发写、从库单线程重放（5.7 之前）→ 从库跟不上主库
--   2. 从库硬件差、负载重（被业务大量读）
--   3. 大事务：单条 SQL 影响 100w 行，从库重放也要 1 分钟
--   4. 从库执行慢查询（锁等待、慢 SQL）阻塞 SQL 线程

-- 5.7 并行复制（基于组提交 group_commit）：
--   主库同一组提交的事务可以在从库并行重放
--   slave_parallel_type = LOGICAL_CLOCK
--   slave_parallel_workers = 16

-- 8.0 基于 WRITESET 的并行复制：
--   修改不冲突的事务可并行重放（不依赖组提交）
--   binlog_transaction_dependency_tracking = WRITESET
--   显著提升从库吞吐，降低延迟

-- 检查主从延迟：
SHOW SLAVE STATUS\\G
--   Seconds_Behind_Master: 0      ← 0 表示无延迟
--   Slave_IO_Running: Yes
--   Slave_SQL_Running: Yes

-- 延迟优化策略：
--   1. 升级到 8.0 + WRITESET 并行复制
--   2. 业务读强制走主库（写后立即读，避免读到旧值）
--   3. 大事务拆小（单事务影响 &lt; 1w 行）
--   4. 从库独立机器、不承载慢查询`;

  const haRows = [
    ['MHA',                '第三方脚本',     '监控主库 → 拉选举新主 → 修复旧主 binlog',       '2014 后基本停更；架构简单但运维复杂'],
    ['Orchestrator',       'GitHub 开源',    '拓扑发现 + 故障切换 + Web UI',                  '活跃；支持复杂拓扑'],
    ['Keepalived + VIP',   'VIP 漂移',       '主挂 → VIP 漂到从',                             '简单但可能脑裂'],
    ['MGR (Group Replication)', '官方',      'Paxos 变种，多主/单主自动选主',                 '推荐；强一致但要求 8.0+'],
    ['MySQL InnoDB Cluster', '官方完整方案',  'MGR + MySQL Router + MySQL Shell',              '官方推荐；运维一体化'],
    ['TiDB / OceanBase',    'NewSQL',        '原生分布式多副本 + Raft',                       '跨地域多活首选'],
  ];

  const haTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">方案</div>
        <div class="compare-card-header-cell frontend">来源</div>
        <div class="compare-card-header-cell desc">机制</div>
      </div>
      ${haRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>`;

  const rwSql = `-- 读写分离架构（ShardingSphere / MyCat / 应用层路由）

-- 应用层路由（推荐）：根据 SQL 类型直接路由
--   INSERT/UPDATE/DELETE → 主库
--   SELECT → 从库（强一致读用主库）
--   注解强制走主：@Master

-- ShardingSphere 配置（YAML）
# spring.shardingsphere.datasource:
#   master: { url: jdbc:mysql://master:3306/db, ... }
#   slave0: { url: jdbc:mysql://slave0:3306/db, ... }
#   slave1: { url: jdbc:mysql://slave1:3306/db, ... }
# spring.shardingsphere.rules.readwrite-splitting:
#   data-sources:
#     pr_ds:
#       write-data-source-name: master
#       read-data-source-names: [slave0, slave1]
#       load-balancer-name: round_robin

-- 强一致读的两种方案：
--   1. 写后强制读主：业务上写完立即读时显式走主库
--   2. GTID 会话跟踪：客户端记下写时的 GTID，
--      从库 SELECT WAIT_FOR_EXECUTED_GTID_SET(gtid, timeout)
--      等到从库重放到该 GTID 后再读，避免读到旧值`;

  const trapBox = ruleBox('warning',
    `<strong>主从复制的几个坑</strong>：<br>
    ① <strong>复制延迟导致"写完读不到"</strong>：刚注册的用户立即登录查不到 → 强一致读走主库或用 GTID 等待。<br>
    ② <strong>大事务卡死从库</strong>：单事务删除 1000w 行 → 从库 SQL 线程卡数小时。拆成每批 1w 行。<br>
    ③ <strong>从库被慢查询拖垮</strong>：业务报表跑在从库，单条 SQL 跑 1 小时 → 阻塞复制回放。报表分离到独立 OLAP 库。<br>
    ④ <strong>DDL 引起复制中断</strong>：主库加字段，从库重放时表锁等待超时。低峰期执行 + <code>ALGORITHM=INPLACE</code>。<br>
    ⑤ <strong>双 1 配置不可妥协</strong>：<code>innodb_flush_log_at_trx_commit=1</code> + <code>sync_binlog=1</code>，否则主库宕机丢数据。`);

  return articleShell(t, `
    ${section('主从复制的本质', conclusion)}
    ${section('binlog vs redo log', `<div class="section-body">${binlogHtml}</div>`)}
    ${section('异步复制流程', `<div class="section-body">${flowHtml}</div>`)}
    ${section('三种复制模式', modesTable)}
    ${section('主从延迟：原因与解决', codeBlock('SQL · 并行复制与延迟排查', 'dot-blue', 'sql', delaySql))}
    ${section('高可用方案对比', haTable)}
    ${section('读写分离落地', codeBlock('SQL · 读写分离与强一致读', 'dot-orange', 'yaml', rwSql))}
    ${section('复制常见陷阱', trapBox)}`);
}
