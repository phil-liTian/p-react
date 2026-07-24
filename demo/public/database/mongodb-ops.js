function renderMongodbOps(t) {
  const conclusion = ruleBox('warning',
    `MongoDB 在生产环境出问题往往源于<strong>"忽视了 NoSQL 的工程约束"</strong>：以为灵活就可以乱建集合、以为分片就能水平扩展、以为副本集就高枕无忧。这一节汇总生产高频问题——大文档、索引误用、内存爆掉、写放大、备份恢复、安全配置、版本升级陷阱——每个都是真实事故的提炼。`);

  const hotRows = [
    ['大文档',          '单文档接近或超 16MB',                '读写慢、网络阻塞、迁移卡顿',                 '拆分嵌套 / GridFS / 子集模式'],
    ['索引膨胀',        '索引占内存超过 WiredTiger 缓存',     '查询走全表扫描、整体变慢',                   '清理冗余索引 + IndexStats 监控'],
    ['Working Set 超 RAM', '热数据 + 索引 > 内存',             '频繁刷盘、性能断崖式下降',                   '扩内存 + 分片分散 + 冷数据归档'],
    ['写放大',          '小更新触发整页重写',                '写性能差、磁盘 IO 飙升',                     'WiredTiger 压缩 + 批量写'],
    ['oplog 溢出',      'Secondary 长时间离线后 oplog 被覆盖', 'Secondary 无法增量同步',                     '扩 oplog + 监控复制延迟'],
    ['连接数爆掉',      '应用连接池过大或不复用',            'mongod 拒绝连接、内存飙升',                  '合理连接池 + mongos 路由'],
    ['副本集脑裂',      '网络分区导致双主',                  '写冲突、数据不一致',                         '多数派写 + 心跳超时配置'],
    ['分片数据倾斜',    '分片键选择不当',                    '某 Shard 持续过载，其他空闲',                '重新评估分片键 + hash 分片'],
  ];

  const hotTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">问题</div>
        <div class="compare-card-header-cell frontend">现象</div>
        <div class="compare-card-header-cell desc">解决</div>
      </div>
      ${hotRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]} → ${r[3]}</div>
      </div>`).join('')}
    </div>`;

  const memCmd = `// 内存与缓存监控：WiredTiger 缓存是性能命门

// 关键指标
db.serverStatus().wiredTiger.cache
//   "bytes currently in the cache"     → 当前缓存占用
//   "maximum bytes configured"          → 缓存上限（默认 (RAM - 1GB) / 2）
//   "pages read into cache"             → 缓存未命中次数（高 = 缺索引或 Working Set 大）
//   "pages evicted by application threads" → 应用线程触发的驱逐（高 = 缓存不够）

// 缓存命中率监控
db.serverStatus().wiredTiger.cache['pages requested from the cache']
db.serverStatus().wiredTiger.cache['pages read into cache']
// 命中率 = 1 - (read_into / requested)
//   < 95% → Working Set 超内存或索引不合理

// 内存调优
//   WiredTiger 默认缓存 = (RAM - 1GB) / 2
//   生产环境专用机器建议调到 60~70%：
mongod --wiredTigerCacheSizeGB 8

// 查看数据与索引大小
db.stats()                         // 数据库总览
db.orders.stats()                  // 集合统计
db.orders.stats().indexSizes       // 各索引大小
//   若 indexes size 接近 cache → 需清理冗余索引或扩内存

// 慢查询监控（profile）
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)
//   关键字段：op / ns / query / millis / nreturned / docsExamined
//   docsExamined / nreturned 比值大 → 索引问题`;

  const writeAmpCmd = `// 写放大（Write Amplification）问题

// 现象：用户一次 UPDATE 一个字段，磁盘 IO 飙升
// 原因：WiredTiger 默认 4KB 页大小，即使改 1 字节也要重写整页
//   加上 checkpoint 默认每 60s 触发刷盘 → 写放大 ~3~5 倍

// 解决方案：

// 1. 启用 Snappy 压缩（默认已开）
mongod --wiredTigerCollectionBlockCompressor snappy
//   数据 + 索引都压缩，磁盘占用减少 50~70%

// 2. 批量写：用 insertMany / bulkWrite
db.orders.bulkWrite([
  { updateOne: { filter: {_id:1}, update: {$set:{status:'PAID'}} } },
  { updateOne: { filter: {_id:2}, update: {$set:{status:'PAID'}} } },
  // ... 批量合并刷盘
])

// 3. 减少 checkpoint 频率（权衡持久性）
mongod --wiredTigerCheckpointDelayTime=30     // 默认 60s

// 4. 避免高频更新同一文档
//   如库存计数器：用 $inc 原子操作 + 分桶（按分钟聚合）

// 5. 写关注降低（权衡一致性）
db.orders.insertOne(doc, { writeConcern: { w: 1 } })   // 主库确认即可
//   w:majority 会等所有副本写入确认，吞吐降低`;

  const backupCmd = `# 备份与恢复方案

# 1. mongodump / mongorestore：逻辑备份（导出 BSON）
mongodump --host rs0/host1:27017,host2:27017 \
  --db mydb --out /backup/$(date +%Y%m%d)
#   优点：可读、跨版本
#   缺点：大数据慢、不保证一致性（除非加 --oplog）

mongorestore --host ... /backup/20260719/mydb

# 2. 文件系统快照：物理备份（最快）
#   LVM / ZFS / 云盘快照
#   要求：journal 与数据在同一卷、写入暂停（db.fsyncLock()）
db.fsyncLock()              # 阻塞写入、刷盘
#   → 在文件系统层做快照
db.fsyncUnlock()            # 解锁

# 3. mongoexport / mongoimport：CSV/JSON 导出导入（数据迁移用）
mongoexport --db mydb --collection users --type json --out users.json
mongoimport --db mydb --collection users --file users.json

# 4. oplog 备份：增量备份
#   全量备份 + 持续备份 oplog → 可恢复到任意时间点
mongodump --oplog --out /backup/full              # 全量
#   增量：用 mongodump --local 备份 oplog.rs

# 5. MongoDB Atlas / Ops Manager：商业方案
#   自动备份 + 时间点恢复 + 跨 region 复制

# PITR（Point-in-Time Recovery）：
#   1. 恢复最近一次全量备份
#   2. 重放 oplog 到指定时间点
mongorestore --oplogReplay --oplogLimit <timestamp> /backup/full

# 灾备演练：定期从备份恢复到测试环境，验证可用性`;

  const securityCmd = `# 安全配置清单

# 1. 启用认证（默认未开启，生产必须开）
security:
  authorization: enabled

# 2. 创建管理员与业务用户
use admin
db.createUser({
  user: 'admin',
  pwd: passwordPrompt(),
  roles: [ { role: 'root', db: 'admin' } ]
})

use mydb
db.createUser({
  user: 'appUser',
  pwd: passwordPrompt(),
  roles: [ { role: 'readWrite', db: 'mydb' } ]
})

# 3. 内置角色
#   read / readWrite：单库读写
#   dbAdmin：库管理（建索引、stats）
#   userAdmin：库用户管理
#   readAnyDatabase / readWriteAnyDatabase：全库
#   root：超级管理员（慎用）

# 4. TLS/SSL 加密传输
net:
  ssl:
    mode: requireSSL
    PEMKeyFile: /etc/mongo/server.pem
    CAFile: /etc/mongo/ca.pem

# 5. 静态加密（Atlas / Enterprise 版）
security:
  enableEncryption: true
  encryptionKeyFile: /etc/mongo/encryption-key

# 6. 网络隔离
#   - 绑定内网 IP：bindIp: 10.0.0.1
#   - 防火墙只开应用服务器 IP
#   - 生产不要暴露 27017 到公网

# 7. 审计日志（Enterprise 版）
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.log

# 8. 常见安全漏洞
#   - 默认无密码（很多事故源头）
#   - 暴露公网 + 弱密码 → 勒索病毒删库
#   - 未限制 bindIp → 任意人可连
#   - 业务用户给了 root 权限`;

  const upgradeHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px">版本升级路径</div>
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
        MongoDB 仅支持<strong style="color:var(--text-primary)">相邻主版本升级</strong>（如 5.0 → 6.0），不能跨版本（5.0 → 7.0 需先升 6.0）。<br><br>
        <strong style="color:var(--text-primary)">升级流程</strong>：① 阅读升级指南与不兼容变更；② 测试环境验证；③ 备份；④ 副本集滚动升级（先 Secondary，再 stepDown Primary，最后升级 Primary）；⑤ 分片集群先升 mongos，再升 config，最后逐 Shard 升级。<br><br>
        <strong style="color:var(--text-primary)">常见坑</strong>：驱动版本不兼容（升级服务端要同步升级驱动）、索引构建方式变化（5.0 后默认 hybrid 在线构建）、移除的特性（如 6.0 移除 mapReduce、5.0 移除 mirrorRead）。
      </div>
    </div>`;

  const opsHtml = `
    <ul style="margin:0;padding-left:20px;font-size:12.5px;color:var(--text-secondary);line-height:1.9">
      <li><strong>监控必备指标</strong>：连接数、缓存命中率、复制延迟、oplog 大小、慢查询数、磁盘使用率</li>
      <li><strong>WiredTiger 缓存</strong>：专用机器建议 60~70% RAM；混部机器保持默认（避免与 OS 抢内存）</li>
      <li><strong>预分配磁盘</strong>：MongoDB 会预分配数据文件，文件系统选 XFS（推荐）或 ext4</li>
      <li><strong>禁用 transparent hugepage</strong>：与 Redis 一样，THP 影响延迟稳定性</li>
      <li><strong>journal 单独磁盘</strong>：高写入场景把 journal 放独立 SSD</li>
      <li><strong>副本集最少 3 节点</strong>：避免脑裂；条件允许 3 数据节点（不只用仲裁）</li>
      <li><strong>oplog 配置</strong>：默认 5% 磁盘，生产建议显式设 5GB+ 或 24h 写入量</li>
      <li><strong>分片键设计阶段评审</strong>：分片键几乎不可更改，上线前做容量规划</li>
      <li><strong>IndexStats 定期审计</strong>：每月检查 0 访问索引并清理</li>
      <li><strong>定期演练</strong>：故障切换演练、备份恢复演练，每季度一次</li>
      <li><strong>慢查询告警</strong>：超过 1s 的查询自动告警 + 记录 profile</li>
      <li><strong>连接池配置</strong>：单应用 maxPoolSize 50~100，mongos 多实例时考虑总连接数</li>
    </ul>`;

  return articleShell(t, `
    ${section('生产问题总览', conclusion)}
    ${section('高频问题速查表', hotTable)}
    ${section('内存与缓存监控', codeBlock('MongoDB · WiredTiger 缓存', 'dot-blue', 'javascript', memCmd))}
    ${section('写放大问题', codeBlock('MongoDB · 写放大优化', 'dot-orange', 'javascript', writeAmpCmd))}
    ${section('备份与恢复', codeBlock('MongoDB · 备份恢复方案', 'dot-green', 'shell', backupCmd))}
    ${section('安全配置清单', codeBlock('MongoDB · 安全加固', 'dot-red', 'yaml', securityCmd))}
    ${section('版本升级陷阱', `<div class="section-body">${upgradeHtml}</div>`)}
    ${section('运维经验清单', `<div class="section-body">${opsHtml}</div>`)}`);
}
