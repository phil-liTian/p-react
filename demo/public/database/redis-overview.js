function renderRedisOverview(t) {
  const conclusion = ruleBox('danger',
    `Redis 是基于内存的<strong>键值（KV）数据库</strong>，所有数据常驻内存 + 单线程命令处理，使其读写延迟稳定在<strong>亚毫秒级</strong>，单机 QPS 轻松破 10 万。除了缓存，Redis 内置 5 大数据结构、Pub/Sub、Lua 脚本、Stream，被广泛用作<strong>分布式锁、会话存储、排行榜、消息队列</strong>——凡是要求"低延迟 + 高并发"的协调场景，几乎都能看到 Redis。`);

  const scenariosHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:4px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">⚡</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">热点缓存</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          最经典的场景。用户信息、商品详情、配置字典这类<strong style="color:var(--text-primary)">读多写少</strong>的数据放 Redis，挡在 MySQL 前面。一次 Redis GET 几百微秒 vs 一次 MySQL 查询几毫秒——10 倍以上的差距。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🔒</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">分布式锁</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          多实例部署时 <code>SET key value NX PX 30000</code> + Lua 释放是事实标准。库存扣减、防重复提交、定时任务去重——单机 JVM 锁管不到跨进程，必须借助 Redis 这种共享存储。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🎫</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">Session / Token 存储</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          多台 Web 服务器之间共享登录态：用户请求打到哪台机器都能识别。Spring Session、express-session-redis 都是这套机制。前端 JWT 的黑名单（登出后失效）也常放 Redis。
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:22px;margin-bottom:8px">🏆</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px">排行榜 / 计数器</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <code>ZADD</code> + <code>ZRANGEBYSCORE</code> 实时排行榜（游戏积分、热搜、直播打赏）；<code>INCR</code> 原子计数器（限流、点赞数、UV 统计）。MySQL 写这些数据要加锁，Redis 单线程天然原子。
        </div>
      </div>
    </div>`;

  const stackRows = [
    ['Key-Value 内存存储',       'Map / localStorage',            'Redis 跨进程共享、可持久化、可分布式；Map 是进程内单机'],
    ['单线程命令处理',           'Node.js 事件循环',              '单线程避免锁竞争，IO 多路复用（epoll）支撑高并发——与 Node 同源思想'],
    ['5 大数据结构',             'JS 内置数据结构',               'String/Hash/List/Set/ZSet ≈ string/对象/数组/Set/排序 Map'],
    ['TTL 过期 + LRU 淘汰',      'Map + 手动定时清理',            'Redis 内置过期策略与内存淘汰机制，无需应用层关心'],
    ['RDB / AOF 持久化',         'IndexedDB',                     'Redis 内存断电即失，需持久化兜底；IndexedDB 是浏览器本地存储'],
    ['Pub/Sub',                 'EventEmitter / WebSocket',      'Redis 跨进程广播；EventEmitter 仅进程内'],
    ['Lua 脚本（原子执行）',     '无直接对应',                    '多命令组合必须原子时，Lua 脚本是 Redis 独有能力'],
    ['主从 + 哨兵 + Cluster',    '—（前端无对应）',               '高可用与水平扩展的完整方案'],
  ];

  const stackTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">Redis 概念</div>
        <div class="compare-card-header-cell frontend">前端 / Node 对应</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${stackRows.map(([db, fe, desc]) => `
      <div class="compare-card-row">
        <div class="compare-card-cell db">${db}</div>
        <div class="compare-card-cell frontend">${fe}</div>
        <div class="compare-card-cell desc">${desc}</div>
      </div>`).join('')}
    </div>`;

  const singleThreadBox = ruleBox('info',
    `<strong>为什么单线程还这么快？</strong>命令执行在单线程，但 IO 是多路复用（epoll/kqueue），单线程同时监听数万连接。<strong>瓶颈不在 CPU 而在内存与网络</strong>——避免了多线程加锁、上下文切换的开销。Redis 6.0 后引入多线程处理网络读写，但命令执行仍是单线程，保持原子性。这套思想与 <strong>Node.js 事件循环</strong>一脉相承。`);

  const dsBox = ruleBox('success',
    `<strong>5 大数据结构</strong>：<code>String</code>（最常用，缓存对象时 JSON 序列化） · <code>Hash</code>（字段级更新，存用户属性比 String 节省内存） · <code>List</code>（双端队列，消息队列、最新动态） · <code>Set</code>（去重、交并集，共同好友） · <code>ZSet</code>（带分数的排序集合，排行榜首选）。扩展类型还有 <code>Bitmap</code>（签到）、<code>HyperLogLog</code>（UV 近似去重）、<code>Stream</code>（5.0+ 消息队列）。`);

  const persistCmd = `# RDB：周期性快照，二进制紧凑，恢复快但可能丢数据
save 900 1          # 900s 内 1 个 key 变化触发快照
save 300 10
dbfilename dump.rdb

# AOF：追加写命令日志，更安全但文件大
appendonly yes
appendfsync everysec  # 每秒刷盘，宕机最多丢 1s（推荐）
# appendfsync always  # 每次写都刷盘，最安全但性能差
# appendfsync no       # 交给 OS，性能最好但可能丢更多

# 4.0+ 混合持久化：AOF 文件 = RDB 快照 + 增量命令
aof-use-rdb-preamble yes`;

  const cacheAsideCmd = `-- Cache Aside（旁路缓存）—— 最常用的缓存模式
-- 1. 读：先查 Redis，未命中查 MySQL 并回写
GET user:1001
-- (nil) → 查 MySQL → SET user:1001 '{...}' EX 3600

-- 2. 写：先更新 MySQL，再删除 Redis（不是更新！）
-- 删除而非更新可避免并发下的脏数据
DEL user:1001

-- 防穿透：查不到的 key 也缓存空值（短 TTL）
SET user:9999 '' EX 60

-- 防击穿：热点 key 加互斥锁重建
SET lock:user:1001 1 NX PX 5000

-- 防雪崩：TTL 加随机抖动，避免同时大批过期
SET k v EX 3600`;

  const notForHtml = `
    <p>Redis 不擅长或需要谨慎使用的场景：</p>
    <ul>
      <li><strong>大 Value 存储</strong>：单个 key 超过 10KB 会阻塞单线程，应拆分为 Hash 或转外部存储</li>
      <li><strong>关系查询 / 复杂 JOIN</strong>：Redis 没有表关系，强行用 key 拼凑会很脆弱——这种数据回 MySQL</li>
      <li><strong>冷数据 / 海量历史</strong>：内存成本远高于磁盘，冷数据应放 MySQL / 对象存储，Redis 只放热数据</li>
      <li><strong>强一致事务</strong>：Redis 事务（MULTI/EXEC）不支持回滚，Lua 脚本只是原子执行，跨多 key 强一致仍需 MySQL</li>
      <li><strong>消息队列（高可靠）</strong>：Stream 比早期 List/Pub-Sub 强，但持久化与消费确认仍弱于 Kafka/RabbitMQ，金融级用 MQ</li>
    </ul>`;

  return articleShell(t, `
    ${section('Redis 是什么', conclusion)}
    ${section('主要应用场景', scenariosHtml)}
    ${section('Redis vs 前端 / MySQL 存储', stackTable)}
    ${section('核心概念：单线程 + IO 多路复用', singleThreadBox)}
    ${section('核心概念：5 大数据结构', dsBox)}
    ${section('持久化：RDB vs AOF', codeBlock('redis.conf · 持久化配置', 'dot-yellow', 'ini', persistCmd))}
    ${section('缓存模式与三大问题', codeBlock('Redis · Cache Aside + 防穿透/击穿/雪崩', 'dot-orange', 'shell', cacheAsideCmd))}
    ${section('Redis 不擅长的领域', `<div class="section-body">${notForHtml}</div>`)}`);
}
