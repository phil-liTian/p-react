function renderRedisPitfalls(t) {
  const conclusion = ruleBox('danger',
    `Redis 在生产环境出问题几乎都是<strong>同一批"经典坑"</strong>：缓存穿透、缓存击穿、缓存雪崩、缓存与 DB 不一致、热 Key 打挂、大 Key 阻塞、分布式锁失效。每个问题都有成熟的解决方案——但<strong>方案不是堆砌工具，而是理解每个权衡</strong>。这一节是面试与实战的高频题。`);

  const threeRows = [
    ['缓存穿透',   '查询<strong>不存在</strong>的数据，绕过缓存直击 DB',           '恶意攻击：用不存在的 id 大量请求',       '① 缓存空值（短 TTL）<br>② 布隆过滤器拦截'],
    ['缓存击穿',   '<strong>热点 key 过期</strong>瞬间，大量并发请求直击 DB',      '秒杀商品缓存刚好过期',                  '① 互斥锁重建（SETNX）<br>② 热点 key 永不过期 + 异步刷新'],
    ['缓存雪崩',   '<strong>大量 key 同时过期</strong>，或 Redis 宕机',             '批量预热的 key 设了相同 TTL',           '① TTL 加随机抖动<br>② 多级缓存<br>③ Redis 高可用集群'],
  ];

  const threeTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">问题</div>
        <div class="compare-card-header-cell frontend">现象</div>
        <div class="compare-card-header-cell frontend">典型场景</div>
        <div class="compare-card-header-cell desc">解决方案</div>
      </div>
      ${threeRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${r[0]}</div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell frontend">${r[2]}</div>
        <div class="compare-card-cell desc">${r[3]}</div>
      </div>`).join('')}
    </div>`;

  const penetrationCmd = `# 缓存穿透解决方案

# 方案 1：缓存空值（简单但占内存）
# 查不到的 key 也缓存空字符串，短 TTL（60s）
GET user:9999
# (nil) → 查 MySQL 也没有 → SET user:9999 '' EX 60
# 下次请求 GET user:9999 返回 '' → 不再打 DB

# 方案 2：布隆过滤器（推荐，省内存）
# 启动时把所有合法 id 加进布隆过滤器
BF.ADD users_bloom 1001
BF.ADD users_bloom 1002
...
BF.EXISTS users_bloom 9999   # 返回 0 → 一定不存在，直接拒绝
# 误判率约 1%，存在误判但不会漏判

# 拦截链路：
#   请求 → 布隆过滤器（不存在直接返回）
#        → Redis 缓存（命中返回）
#        → MySQL（查到回写 Redis，查不到回写空值）

# 方案 3：网关层限流 + 黑名单（针对恶意攻击）
# 同一 IP / 同一参数高频请求 → 限流或封禁`;

  const breakdownCmd = `# 缓存击穿解决方案

# 方案 1：互斥锁重建（单飞模式）
# 缓存未命中时，先抢锁，抢到的查 DB 重建缓存
GET hot:1001
# (nil) → 抢锁
SET lock:hot:1001 1 NX PX 5000
#   抢到 → 查 MySQL → SET hot:1001 v EX 3600 → DEL lock
#   抢不到 → sleep 50ms 重试 GET hot:1001

# Lua 实现单飞（避免 race condition）：
EVAL "if redis.call('GET', KEYS[1]) then \\
        return redis.call('GET', KEYS[1]) \\
      elseif redis.call('SET', KEYS[2], 1, 'NX', 'PX', 5000) then \\
        return 'REBUILD' \\
      else return 'WAIT' end" 2 hot:1001 lock:hot:1001

# 方案 2：热点 key 永不过期 + 异步刷新
# 逻辑过期：value 里带 expire_at 字段，不依赖 Redis TTL
SET hot:1001 '{"v":"data","expire_at":1721300000}'
# 读取时发现 expire_at < now → 异步触发重建（其他请求仍返回旧值）
# 适用：能容忍短暂脏数据的场景（如排行榜）

# 方案 3：多级缓存（Local + Redis）
# Caffeine 本地缓存挡第一层 → Redis 挡第二层 → DB
# 单机缓存命中无网络开销，Redis 失效也不至于全部打 DB`;

  const avalancheCmd = `# 缓存雪崩解决方案

# 方案 1：TTL 加随机抖动（最常用）
# 避免大量 key 同时过期
SET k1 v1 EX 3600
SET k2 v2 EX 3600$((RANDOM % 300))   # 3600~3900s 之间随机
# 或在写入时：
#   ttl = base_ttl + random(0, 300)
#   redis.set(key, value, ex=ttl)

# 方案 2：多级缓存兜底
#   Caffeine (本地) → Redis (分布式) → DB
# Redis 整体宕机时本地缓存仍能撑一会儿

# 方案 3：Redis 高可用集群
#   主从 + 哨兵（自动故障切换）
#   或 Cluster 分片（部分节点挂不影响全局）
# 详见 redis-cluster topic

# 方案 4：熔断降级（Sentinel / Hystrix）
#   Redis 大面积超时 → 触发熔断 → 走降级逻辑（默认值/本地缓存）
#   防止雪崩传导到 DB 把 DB 也压垮`;

  const consistencyHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">Cache Aside 的一致性问题</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code># 写流程的两个选择：

# 方案 A：先更新 DB，再更新 Redis（❌ 不推荐）
UPDATE db SET v=2 WHERE id=1
SET redis:1 2
# 并发问题：A 先 update DB 但 SET 慢，B 后 update DB 且 SET 快
#           → Redis 留下 A 的旧值，DB 是 B 的新值，不一致

# 方案 B：先更新 DB，再删除 Redis（✅ 推荐，Cache Aside）
UPDATE db SET v=2 WHERE id=1
DEL redis:1
# 删除而非更新：下次读会触发重建，避免并发覆盖问题
# 仍可能不一致：A 删 Redis → B 读未命中查 DB(旧值) 写 Redis(旧)
#              → A 更新 DB，Redis 留下 B 的旧值
# 缓解：延迟双删（更新 DB 后异步延迟 500ms 再删一次）

# 方案 C：先删 Redis，再更新 DB（也有问题）
DEL redis:1
UPDATE db SET v=2 WHERE id=1
# 并发：A 删 Redis → B 读未命中查 DB(旧值) 写 Redis(旧)
#       → A 更新 DB，Redis 仍是旧值
# 解决：延迟双删 + 消息队列订阅 binlog 异步删缓存</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">终极方案：订阅 binlog 异步删缓存</strong>。用 Canal 订阅 MySQL binlog → 发到 Kafka → 消费者删除对应 Redis key。完全解耦，无并发问题。代价是引入额外组件、有秒级延迟。阿里、美团等大厂内部基本都用这套。
    </p>`;

  const hotKeyHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px">🔥 热 Key 问题</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <strong style="color:var(--text-primary)">现象</strong>：某个 key 的 QPS 远超单实例承受能力（如明星绯闻、秒杀商品），单节点 CPU 飙升、其他节点空闲。<br><br>
          <strong style="color:var(--text-primary)">发现</strong>：<code>redis-cli --hotkeys</code>（需开启 LFU）、<code>MONITOR</code> 抓命令、业务监控。<br><br>
          <strong style="color:var(--text-primary)">解决</strong>：① 拆分到多个 key（hot:1001:0~9 分片到不同节点）；② 本地缓存（Caffeine）；③ 多副本读（Slave 也参与读）。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--yellow);margin-bottom:8px">📦 大 Key 问题</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <strong style="color:var(--text-primary)">现象</strong>：单个 key 的 value 过大（&gt;10KB）或集合元素过多（&gt;1万）。读写阻塞单线程、网络带宽占满、DEL 阻塞、集群迁移卡顿。<br><br>
          <strong style="color:var(--text-primary)">发现</strong>：<code>redis-cli --bigkeys</code>、<code>MEMORY USAGE key</code>、RDB 文件分析工具（rdb-tools）。<br><br>
          <strong style="color:var(--text-primary)">解决</strong>：① 拆分（Hash 字段化、按时间分 key）；②压缩（gzip / protobuf）；③ 删除用 <code>UNLINK</code> 异步删。
        </div>
      </div>
    </div>`;

  const lockCmd = `# 分布式锁演进：从 SETNX 到 Redisson 看门狗

# ❌ 基础版（有缺陷）
SETNX lock:order 1        # 抢锁
EXPIRE lock:order 30      # 加过期（防死锁）
# 问题：SETNX 与 EXPIRE 非原子，中间宕机 → 锁永远不释放

# ✅ 改进版（SET NX PX）
SET lock:order "uuid-xxxx" NX PX 30000
# value 必须是唯一标识，释放时校验避免误删别人的锁

# 释放锁：必须用 Lua 校验 + 删除原子
EVAL "if redis.call('GET', KEYS[1]) == ARGV[1] then \\
        return redis.call('DEL', KEYS[1]) \\
      else return 0 end" 1 lock:order "uuid-xxxx"

# ⚠ 仍剩两个问题：
#   1. 业务执行超过 30s，锁自动释放 → 别人能拿到锁 → 两个客户端同时执行
#   2. 第一个客户端执行完后试图 DEL，可能删掉第二个客户端刚加的锁

# ✅ Redisson 看门狗（生产推荐）
# 加锁时启动一个后台线程（看门狗），每隔 1/3 TTL（默认 10s）续期
# 业务执行完释放锁，看门狗停止
# 默认 TTL 30s，看门狗每 10s 续期到 30s，业务卡死时锁不会过期

RLock lock = redisson.getLock("lock:order");
lock.lock();                  // 启动看门狗
try { doBusiness(); }
finally { lock.unlock(); }    // 停止看门狗

# 跨 Redis 实例的高可用锁：RedLock
#   在 N/2+1 个独立 Redis 实例上加锁，避免单点宕机导致锁失效
#   争议：Martin Kleppmann 指其 GC pause 仍可能失效，生产慎用`;

  return articleShell(t, `
    ${section('生产高频问题总览', conclusion)}
    ${section('缓存三大问题：穿透 / 击穿 / 雪崩', threeTable)}
    ${section('缓存穿透：空值缓存 + 布隆过滤器', codeBlock('Redis · 防穿透', 'dot-blue', 'shell', penetrationCmd))}
    ${section('缓存击穿：互斥锁 + 永不过期', codeBlock('Redis · 防击穿', 'dot-orange', 'shell', breakdownCmd))}
    ${section('缓存雪崩：TTL 抖动 + 多级缓存', codeBlock('Redis · 防雪崩', 'dot-red', 'shell', avalancheCmd))}
    ${section('缓存与 DB 一致性', `<div class="section-body">${consistencyHtml}</div>`)}
    ${section('热 Key 与大 Key', `<div class="section-body">${hotKeyHtml}</div>`)}
    ${section('分布式锁演进：Redisson 看门狗', codeBlock('Redis · 分布式锁', 'dot-orange', 'shell', lockCmd))}`);
}
