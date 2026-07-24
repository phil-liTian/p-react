function renderRedisConcepts(t) {
  const conclusion = ruleBox('danger',
    `Redis 的"快"不是魔法，而是<strong>三个工程选择叠加的结果</strong>：① 数据常驻内存（纳秒级访问）；② 单线程命令处理（无锁竞争、无上下文切换）；③ IO 多路复用（epoll 一个线程盯数万连接）。理解这套设计，就理解了"为什么单线程还快"、"为什么不能存大 Key"、"为什么 6.0 又引入多线程"。`);

  const singleThreadHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">单线程模型：命令执行 + IO 多路复用</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>                    ┌──────────────────────────────┐
   客户端连接 1 ──→  │                              │
   客户端连接 2 ──→  │   IO 多路复用（epoll/kqueue）  │  ← 监听所有 socket 的读写事件
   客户端连接 N ──→  │                              │
                    └──────────────┬───────────────┘
                                   ↓ 事件就绪后串行处理
                    ┌──────────────────────────────┐
                    │   单线程命令执行器              │  ← 串行执行，天然原子
                    │   GET → SET → INCR → ZADD ...  │
                    └──────────────┬───────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │   内存数据结构                  │
                    └──────────────────────────────┘

关键点：
  • 命令执行单线程 → GET / SET / INCR 天然原子，无需加锁
  • IO 多路复用 → 一个线程同时监听数万连接，IO 不阻塞
  • 瓶颈在内存 + 网络，不在 CPU
  • 6.0+ 多线程仅处理网络读写（解析/回包），命令执行仍单线程</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">为什么 6.0 引入多线程网络 IO？</strong>单线程在网络数据解析/回包上消耗 CPU，遇到大 Value 或高 QPS 网络处理成为瓶颈。多线程只处理 read/write 系统调用与协议解析，命令执行仍单线程——保持原子性的同时榨干网络带宽。
    </p>`;

  const dsRows = [
    ['String',   'SDS（动态字符串）',   '缓存对象(JSON) / 计数器 / 分布式锁', 'GET / SET / INCR / SETNX'],
    ['Hash',     'ziplist / hashtable', '对象字段级存储（用户属性）',         'HSET / HGET / HGETALL / HINCRBY'],
    ['List',     'quicklist（双向链表 + ziplist）', '消息队列 / 最新动态 / 栈',  'LPUSH / RPOP / LRANGE / BLPOP'],
    ['Set',      'intset / hashtable', '去重 / 交集（共同好友）/ 标签',       'SADD / SISMEMBER / SINTER / SUNION'],
    ['ZSet',     'ziplist / skiplist + hashtable', '排行榜 / 延迟队列',         'ZADD / ZRANGEBYSCORE / ZREVRANGE / ZPOPMIN'],
  ];

  const dsTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">类型</div>
        <div class="compare-card-header-cell frontend">底层结构</div>
        <div class="compare-card-header-cell desc">典型场景</div>
      </div>
      ${dsRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>编码转换</strong>：小数据用紧凑结构（ziplist / intset）省内存，超过阈值自动升级为标准结构（hashtable / skiplist）。如 Hash 元素数 &lt; 128 且单值 &lt; 64B 用 ziplist，超过则升级为 hashtable。阈值由 <code>hash-max-ziplist-entries / hash-max-ziplist-value</code> 控制。
    </p>`;

  const extHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--accent);margin-bottom:8px">Bitmap 位图</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          String 的位操作扩展。1 亿用户的<strong style="color:var(--text-primary)">每日签到</strong>只需 12MB（1 亿 bit）。<br><br>
          <code>SETBIT sign:uid:20260718 0 1</code><br>
          <code>BITCOUNT sign:uid:20260718</code> 统计签到天数<br>
          <code>BITOP AND dst src1 src2</code> 连续签到计算
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--blue);margin-bottom:8px">HyperLogLog</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <strong style="color:var(--text-primary)">基数估算</strong>，固定 12KB 内存估算亿级 UV，误差 0.81%。<br><br>
          <code>PFADD uv:20260718 uid1 uid2 ...</code><br>
          <code>PFCOUNT uv:20260718</code> 返回近似 UV<br>
          相比 Set 存 uid 省 1000 倍内存，代价是去重结果不精确
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:8px">Geo</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          基于 ZSet 的<strong style="color:var(--text-primary)">地理位置</strong>编码（GeoHash）。<br><br>
          <code>GEOADD drivers 116.40 39.90 "driver1"</code><br>
          <code>GEORADIUS drivers 116.40 39.90 5 km COUNT 10</code><br>
          找"附近 5km 的司机"，打车外卖核心场景
        </div>
      </div>
      <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px">Stream（5.0+）</div>
        <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
          <strong style="color:var(--text-primary)">可持久化消息队列</strong>，支持消费组与 ACK。<br><br>
          <code>XADD orders * user 1001 amt 99</code><br>
          <code>XREADGROUP GROUP g1 c1 COUNT 10 STREAMS orders &gt;</code><br>
          早期 List 队列无 ACK，Stream 弥补可靠性
        </div>
      </div>
    </div>`;

  const persistHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead>
          <tr style="color:var(--text-secondary);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:6px 8px">维度</th>
            <th style="text-align:left;padding:6px 8px">RDB</th>
            <th style="text-align:left;padding:6px 8px">AOF</th>
          </tr>
        </thead>
        <tbody style="color:var(--text-secondary)">
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">原理</td><td>全量数据快照（二进制）</td><td>增量写命令日志</td></tr>
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">文件大小</td><td>小（紧凑二进制）</td><td>大（命令文本）</td></tr>
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">恢复速度</td><td>快（直接 load）</td><td>慢（重放命令）</td></tr>
          <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px 8px">数据安全性</td><td>可能丢最近几分钟</td><td>最多丢 1s（everysec）</td></tr>
          <tr><td style="padding:6px 8px">触发方式</td><td>定时 save / bgsave</td><td>实时追加</td></tr>
        </tbody>
      </table>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">混合持久化（4.0+，推荐）</strong>：AOF 重写时把当前内存做 RDB 快照写入 AOF 文件头部，后续增量命令追加到尾部。兼顾恢复速度（RDB 部分）与数据安全（AOF 部分），生产标配 <code>aof-use-rdb-preamble yes</code>。
    </p>`;

  const expireBox = ruleBox('warning',
    `<strong>过期与淘汰是两件事</strong>：<br>
    <strong>过期策略</strong>（key 带 TTL 到期后如何删）：① <strong>惰性删除</strong>——访问时才检查过期，可能堆积大量过期 key；② <strong>定期删除</strong>——后台周期性抽样删除过期 key。两者结合：定期删大部分，惰性兜底剩。<br>
    <strong>淘汰策略</strong>（内存满时如何腾空间）：8 种 <code>maxmemory-policy</code>——<code>noeviction</code>（拒绝写）、<code>allkeys-lru</code> / <code>volatile-lru</code>（LRU）、<code>allkeys-lfu</code> / <code>volatile-lfu</code>（LFU，4.0+）、<code>allkeys-random</code> / <code>volatile-random</code>（随机）、<code>volatile-ttl</code>（优先删快过期的）。<strong>缓存场景用 allkeys-lru / allkeys-lfu；持久化场景用 noeviction</strong>。`);

  const pipelineCmd = `# Pipeline：批量发送命令减少 RTT
# 普通：N 个命令 = N 次 RTT
SET k1 v1   # RTT 1
SET k2 v2   # RTT 2
SET k3 v3   # RTT 3

# Pipeline：N 个命令一次发出 = 1 次 RTT（命令仍串行执行）
PIPELINE
SET k1 v1
SET k2 v2
SET k3 v3
EXEC

# 适用：批量插入、预热缓存、统计聚合
# 注意：不是原子操作（中间穿插其他客户端命令）

# 事务（MULTI/EXEC）：命令排队原子执行，但不支持回滚
MULTI
INCR counter
SET k v
EXEC
# 中间命令出错不会回滚已执行的——区别于 MySQL 事务

# Lua 脚本：真正的原子操作（脚本执行期间单线程独占）
EVAL "local c = redis.call('GET', KEYS[1]) \\
       if tonumber(c) > 0 then \\
         redis.call('DECR', KEYS[1]) \\
         return 1 \\
       else return 0 end" 1 stock:1001
# 库存扣减、限流计数等场景必备`;

  return articleShell(t, `
    ${section('Redis 快的本质', conclusion)}
    ${section('单线程 + IO 多路复用', `<div class="section-body">${singleThreadHtml}</div>`)}
    ${section('5 大数据结构与底层实现', dsTable)}
    ${section('扩展类型：Bitmap / HyperLogLog / Geo / Stream', `<div class="section-body">${extHtml}</div>`)}
    ${section('持久化：RDB vs AOF vs 混合', `<div class="section-body">${persistHtml}</div>`)}
    ${section('过期策略 vs 淘汰策略', expireBox)}
    ${section('Pipeline / 事务 / Lua 脚本', codeBlock('Redis · 批量与原子操作', 'dot-orange', 'shell', pipelineCmd))}`);
}
