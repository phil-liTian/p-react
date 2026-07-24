function renderRedisTuning(t) {
  const conclusion = ruleBox('warning',
    `Redis 性能调优的核心是<strong>"减少单线程阻塞 + 控制内存使用 + 用对数据结构"</strong>。单线程模型意味着任何慢命令都会拖垮整个实例——一次 <code>KEYS *</code> 能让 QPS 从 10 万跌到 0 持续数秒。掌握 8 种淘汰策略、内存碎片清理、渐进式 rehash、批量操作，是 Redis 运维的基本功。`);

  const evictionRows = [
    ['noeviction',        '不淘汰，写直接报错',                  '持久化场景 / 不能丢数据的场景'],
    ['allkeys-lru',       '所有 key 中淘汰最久未使用',           '通用缓存（推荐）'],
    ['allkeys-lfu',       '所有 key 中淘汰最少使用频次（4.0+）',  '有明显冷热访问模式的缓存'],
    ['allkeys-random',    '所有 key 中随机淘汰',                 '无明显访问模式，几乎不用'],
    ['volatile-lru',      '设了 TTL 的 key 中 LRU',              '混合存储：部分 key 持久、部分可淘汰'],
    ['volatile-lfu',      '设了 TTL 的 key 中 LFU',              '同上，频次维度'],
    ['volatile-random',   '设了 TTL 的 key 中随机',              '几乎不用'],
    ['volatile-ttl',      '设了 TTL 的 key 中优先删快过期的',    '明确知道哪些是临时数据'],
  ];

  const evictionTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">策略</div>
        <div class="compare-card-header-cell frontend">机制</div>
        <div class="compare-card-header-cell desc">适用</div>
      </div>
      ${evictionRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.7">
      <strong>LRU vs LFU</strong>：LRU（Least Recently Used）淘汰最久未访问——缺点是偶尔被访问的冷数据会被误留；LFU（Least Frequently Used，4.0+）淘汰访问频次最少的——能识别"短期热点但长期冷"的数据。访问模式有明显冷热分层时 LFU 更优。<br>
      <strong>近似 LRU</strong>：Redis 不维护全局链表（开销大），而是抽样 5 个 key（<code>maxmemory-samples</code>）淘汰最久未用的，性能与精度的权衡。
    </p>`;

  const memHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:10px">内存监控关键指标</div>
      <pre style="margin:0;background:transparent;color:var(--text-secondary);font-size:12.5px;line-height:1.7"><code>INFO memory
# used_memory         : Redis 分配器分配的总内存（数据 + 元数据）
# used_memory_rss     : 操作系统视角的进程占用内存（含碎片）
# mem_fragmentation_ratio : used_memory_rss / used_memory
#   &gt; 1.5  → 碎片严重，需清理
#   &lt; 1.0  → 内存不足，OS 在 swap，需立即扩容

# 单 key 内存占用
MEMORY USAGE user:1001               # 返回字节数
MEMORY USAGE user:1001 SAMPLES 0     # 精确计算（集合类型）

# 内存碎片清理（4.0+）
CONFIG SET activedefrag yes          # 自动碎片清理
CONFIG SET active-defrag-ignore-bytes 100mb    # 低于 100MB 不清理
CONFIG SET active-defrag-threshold-lower 10    # 碎片率 &gt; 10% 才清理

# 手动清理碎片（重启之外的方式）
MEMORY PURGE                          # jemalloc 主动释放</code></pre>
    </div>
    <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.7;margin:0">
      <strong style="color:var(--text-primary)">为什么会碎片？</strong>Redis 频繁修改/删除不同大小的 key，内存分配器（jemalloc）按固定 size 分配，会产生内部碎片。碎片率 &gt; 1.5 表示有 50% 以上内存浪费——重启最有效但影响可用性，4.0+ 用 activedefrag 在线清理。
    </p>`;

  const rehashHtml = `
    <div style="background:var(--bg-overlay);border:1px solid var(--border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px">渐进式 rehash</div>
      <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.7">
        Redis 的 Hash 表扩容时不一次性迁移（避免阻塞），而是<strong style="color:var(--text-primary)">保留新旧两张表</strong>，每次增删改查时顺便迁移少量桶，直到全部完成。<br><br>
        <strong style="color:var(--text-primary)">触发时机</strong>：① 元素数 ≥ 桶数 × 5（负载因子 ≥ 5）；② <code>bgsave</code> 期间禁止 rehash（避免页分裂触发 COW 大量复制）。<br><br>
        <strong style="color:var(--text-primary)">影响</strong>：rehash 期间内存占用是两张表，约 2 倍峰值——大实例扩容时需预留内存。
      </div>
    </div>`;

  const slowCmdRows = [
    ['KEYS pattern',      'O(N) 全库扫描',            '❌ 生产禁用，用 SCAN 替代'],
    ['SMEMBERS 大 Set',   'O(N) 一次返回所有元素',    '❌ 用 SSCAN 分批或拆分 Set'],
    ['HGETALL 大 Hash',   'O(N) 一次返回所有字段',    '❌ 用 HSCAN 分批'],
    ['LRANGE 0 -1 长 List', 'O(N) 一次返回所有',     '❌ 分页 LRANGE 0 99'],
    ['DEL 大 key',        'O(N) 同步删除阻塞',       '⚠ 用 UNLINK 异步删（4.0+）'],
    ['FLUSHDB / FLUSHALL', '清空数据库',             '⚠ 用 ASYNC 选项异步清空'],
    ['SORT 大集合',        'O(N+M*log M)',           '⚠ 限制结果集 + 加 BY/STORE'],
    ['CONFIG REWRITE',    '同步写盘',                 '低峰期执行'],
  ];

  const slowCmdTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell db">命令</div>
        <div class="compare-card-header-cell frontend">复杂度 / 影响</div>
        <div class="compare-card-header-cell desc">替代方案</div>
      </div>
      ${slowCmdRows.map(r => `
      <div class="compare-card-row">
        <div class="compare-card-cell db"><code>${r[0]}</code></div>
        <div class="compare-card-cell frontend">${r[1]}</div>
        <div class="compare-card-cell desc">${r[2]}</div>
      </div>`).join('')}
    </div>`;

  const slowlogCmd = `# 慢查询日志
CONFIG SET slowlog-log-slower-than 10000   # 单位微秒，10ms 算慢
CONFIG SET slowlog-max-len 128             # 保留最近 128 条慢日志

# 查看慢日志
SLOWLOG GET 10
# 返回：id / 时间戳 / 耗时(μs) / 命令 / 客户端

# 命令耗时监控
# Redis 6.0+ 的 latency monitor
CONFIG SET latency-monitor-threshold 100   # 100ms 以上记录
LATENCY HISTORY event                      # 查看某事件历史
LATENCY GRAPH                              # 图形化展示

# 实时监控（生产慎用，本身有性能开销）
MONITOR                                   # 打印所有命令

# 单 key 操作耗时
DEBUG SLEEP 0.1                           # 模拟阻塞（测试用）`;

  const batchCmd = `# 批量操作优化

# MGET / MSET：批量读写多个 String（一次 RTT）
MGET k1 k2 k3 k4 k5
MSET k1 v1 k2 v2 k3 v3

# Pipeline：批量发送任意命令（不等单个回复）
# 客户端缓冲 N 个命令一起发送 → 1 次 RTT
# 注意：命令仍串行执行，不是原子的
PIPELINE
SET k1 v1
INCR counter
ZADD rank 100 user1
EXEC

# Cluster 下的批量：必须同 slot
# MGET k1 k2 → 若 k1/k2 不在同一节点会报错
# 解决：hash tag 强制同 slot
#   SET {user:1001}:profile ...   # 大括号内参与 hash
#   SET {user:1001}:orders ...
#   MGET {user:1001}:profile {user:1001}:orders   # 同 slot 可批量

# Lua 脚本：原子批量操作
# 多命令打包到脚本，单线程独占执行
EVAL "redis.call('SET', KEYS[1], ARGV[1]) \\
       redis.call('INCR', KEYS[2]) \\
       return redis.call('GET', KEYS[1])" 2 k1 counter "v1"

# 避免大 key 操作：
#   HGETALL big_hash → 改用 HSCAN cursor COUNT 100
#   LRANGE big_list 0 -1 → 改用 LRANGE big_list 0 99 分页
#   SMEMBERS big_set → 改用 SSCAN cursor COUNT 100`;

  const opsHtml = `
    <ul style="margin:0;padding-left:20px;font-size:12.5px;color:var(--text-secondary);line-height:1.9">
      <li><strong>CPU 绑定</strong>：Redis 单线程吃满一个核心，多核机器绑定 NUMA 节点，避免跨 NUMA 内存访问延迟。<code>taskset -c 0,1 redis-server</code></li>
      <li><strong>关闭 THP</strong>：Transparent Huge Pages 与 COW 冲突，<code>echo never &gt; /sys/kernel/mm/transparent_hugepage/enabled</code></li>
      <li><strong>vm.overcommit_memory=1</strong>：避免 bgsave fork 失败，写入 <code>/etc/sysctl.conf</code></li>
      <li><strong>最大客户端连接数</strong>：<code>maxclients 10000</code>，超过会被拒绝。配合连接池（HikariCP 等）控制</li>
      <li><strong>timeout 与 tcp-keepalive</strong>：清理空闲连接，避免连接泄漏。<code>timeout 300</code> + <code>tcp-keepalive 60</code></li>
      <li><strong>RDB 触发时机</strong>：低峰期 bgsave，fork 大实例会卡数百 ms，影响在线业务</li>
      <li><strong>AOF 重写</strong>：<code>auto-aof-rewrite-percentage 100</code>，文件翻倍时重写，避免低峰期外触发</li>
      <li><strong>慢命令告警</strong>：监控 <code>slowlog</code> + 客户端 RT P99 &gt; 10ms 告警</li>
      <li><strong>避免长连接 + 大 Value</strong>：单 Value &gt; 100KB 强制拆分</li>
    </ul>`;

  return articleShell(t, `
    ${section('调优的本质', conclusion)}
    ${section('8 种内存淘汰策略', evictionTable)}
    ${section('内存监控与碎片清理', `<div class="section-body">${memHtml}</div>`)}
    ${section('渐进式 rehash', `<div class="section-body">${rehashHtml}</div>`)}
    ${section('危险命令与替代方案', slowCmdTable)}
    ${section('慢查询与延迟监控', codeBlock('Redis · slowlog 与 latency monitor', 'dot-orange', 'shell', slowlogCmd))}
    ${section('批量操作优化', codeBlock('Redis · MGET / Pipeline / Lua', 'dot-blue', 'shell', batchCmd))}
    ${section('运维经验清单', `<div class="section-body">${opsHtml}</div>`)}`);
}
