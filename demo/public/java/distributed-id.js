function renderDistributedId(t) {

  const conclusion = ruleBox('info',
    `<strong>分布式 ID：多机器同时生成 ID 时，必须保证全局唯一、且最好趋势递增。</strong><br><br>
    单机 <code>UUID</code> 或自增主键够用，分布式场景下：<br>
    • <code>UUID</code> 太长、无序（B+ 树插入性能差）<br>
    • 数据库自增主键有限（单库瓶颈、分库后冲突）<br>
    主流方案：<strong>雪花算法</strong>（本地生成、性能高）、<strong>号段模式</strong>（Leaf，依赖数据库）、<strong>Redis INCR</strong>（依赖 Redis）。`);

  // ── 需求维度 ────────────────────────────────────────────────────────────────────

  const requireRows = [
    ['全局唯一',   '任意机器任意时刻生成的 ID 不重复',       '订单号、支付单号、流水号'],
    ['趋势递增',   '后生成的 ID 大于之前（不要求严格有序）',   'B+ 树插入友好、利于分库分表'],
    ['高性能',     '生成 ID 不成为系统瓶颈',                  '本地生成 &gt; 远程调用'],
    ['高可用',     '生成 ID 的服务不能宕机',                  '依赖方宕机时仍能生成'],
    ['信息安全',   '不能从 ID 反推业务量',                    '避免 ID 连续暴露用户数（部分场景）'],
  ];
  const requireTable = compareCard(requireRows, ['需求', '含义', '重要性']);

  // ── 方案对比 ────────────────────────────────────────────────────────────────────

  const planRows = [
    ['UUID',                '本地生成，无依赖',            '36 位太长、完全无序、B+ 树插入差',          '内部 traceId、文件名'],
    ['数据库自增',          '简单',                       '单点瓶颈、分库冲突',                        '单库小项目'],
    ['数据库号段 (Leaf)',   '一次取一批号段，本地消耗',      '性能高、趋势递增',                          '中大型业务首选'],
    ['Redis INCR',          '原子自增',                    '依赖 Redis、有网络开销',                    '短期限、抢购券号'],
    ['雪花算法 (Snowflake)', '本地生成、64bit、趋势递增',    '依赖时钟、时钟回拨问题',                    '订单号、消息 ID'],
    ['美团 Leaf',           '号段 + Snowflake 双模式',     '综合方案',                                  '大厂订单、流水号'],
    ['百度 UidGenerator',   'Snowflake 改良',              '解决时钟回拨',                              '高并发场景'],
  ];
  const planTable = compareCard(planRows, ['方案', '优点', '缺点', '适用场景']);

  // ── 雪花算法 ────────────────────────────────────────────────────────────────────

  const snowflakeBox = ruleBox('accent',
    `<strong>雪花算法 (Snowflake) 64 位结构：</strong><br><br>
    <code>0 | 41bit 时间戳 | 10bit 机器ID | 12bit 序列号</code><br><br>
    • <strong>1 bit 符号位</strong>：固定 0（保证正数）<br>
    • <strong>41 bit 时间戳</strong>：毫秒级，可用 69 年<br>
    • <strong>10 bit 机器 ID</strong>：支持 1024 台机器<br>
    • <strong>12 bit 序列号</strong>：同一毫秒内可生成 4096 个 ID<br><br>
    <strong>每毫秒理论产能：1024 × 4096 = 419 万 ID/毫秒</strong>，足够任何业务。`);

  const snowflakeCode = `public class SnowflakeIdGenerator {

  private final long epoch = 1704067200000L; // 2024-01-01
  private final long workerIdBits = 10L;
  private final long sequenceBits = 12L;
  private final long maxWorkerId = ~(-1L << workerIdBits);    // 1023
  private final long sequenceMask = ~(-1L << sequenceBits);   // 4095

  private final long workerIdShift = sequenceBits;
  private final long timestampShift = sequenceBits + workerIdBits;

  private final long workerId;
  private long sequence = 0L;
  private long lastTimestamp = -1L;

  public SnowflakeIdGenerator(long workerId) {
    if (workerId > maxWorkerId || workerId < 0)
      throw new IllegalArgumentException("workerId 越界");
    this.workerId = workerId;
  }

  public synchronized long nextId() {
    long timestamp = System.currentTimeMillis();

    // 时钟回拨检测
    if (timestamp < lastTimestamp)
      throw new IllegalStateException("时钟回拨，拒绝生成 ID");

    if (timestamp == lastTimestamp) {
      // 同一毫秒内序列号自增
      sequence = (sequence + 1) & sequenceMask;
      if (sequence == 0) // 序列号用尽，等待下一毫秒
        timestamp = tilNextMillis(lastTimestamp);
    } else {
      sequence = 0L;
    }

    lastTimestamp = timestamp;

    return ((timestamp - epoch) << timestampShift)
         | (workerId << workerIdShift)
         | sequence;
  }

  private long tilNextMillis(long last) {
    long t = System.currentTimeMillis();
    while (t <= last) t = System.currentTimeMillis();
    return t;
  }
}`;

  const snowflakeBlock = codeBlock('雪花算法 Java 实现', 'dot-blue', 'java', snowflakeCode);

  // ── 时钟回拨 ────────────────────────────────────────────────────────────────────

  const clockBox = ruleBox('danger',
    `<strong>雪花算法的致命问题：时钟回拨。</strong><br><br>
    NTP 同步、虚拟机迁移、手动改时间都可能让系统时钟往回拨。一旦回拨，可能生成 <strong>已经生成过的 ID</strong>（重复 ID）。<br><br>
    <strong>解决思路：</strong><br>
    • <strong>直接抛异常</strong>（如示例代码）：简单粗暴，回拨期间业务不可用<br>
    • <strong>等待追平</strong>：回拨几毫秒就 spin 等待<br>
    • <strong>借用未来位</strong>：百度 UidGenerator 用未来 1 秒的 ID 缓冲<br>
    • <strong> drifted workerId</strong>：每次回拨切换 workerId<br>
    • <strong>最后兜底</strong>：业务侧用唯一索引 + 重试`);

  // ── Leaf 号段 ───────────────────────────────────────────────────────────────────

  const leafCode = `// Leaf 号段模式：每次从 DB 拉一批 ID 缓存到本地
// DB 表：leaf_alloc (biz_tag, max_id, step)
//
// 应用启动或号段耗尽时，向 DB 申请：
//   UPDATE leaf_alloc SET max_id = max_id + step WHERE biz_tag = 'order'
//   SELECT max_id FROM leaf_alloc WHERE biz_tag = 'order'
// 拿到 [max_id - step, max_id] 这一段，本地原子分配

@Service
public class LeafIdService {

  @Autowired private LeafMapper leafMapper;

  private final AtomicLong currentId = new AtomicLong(0);
  private final AtomicLong maxId = new AtomicLong(0);
  private final long step = 1000;

  public long nextId(String bizTag) {
    long cur = currentId.getAndIncrement();
    if (cur >= maxId.get()) {
      synchronized (this) {
        if (currentId.get() >= maxId.get()) {
          leafMapper.updateMaxId(bizTag, step);    // DB 申请下一段
          long newMax = leafMapper.selectMaxId(bizTag);
          currentId.set(newMax - step);
          maxId.set(newMax);
        }
      }
      return nextId(bizTag);
    }
    return cur;
  }
}`;

  const leafBlock = codeBlock('Leaf 号段模式简化实现', 'dot-green', 'java', leafCode);

  const leafNote = ruleBox('success',
    `<strong>Leaf 号段的优势：</strong><br>
    • 趋势递增（每段内连续、段间跳跃但整体上升）<br>
    • 高性能（本地分配，无网络开销）<br>
    • DB 宕机也能撑一段时间（缓冲号段未用完）<br><br>
    <strong>缺点：</strong>DB 仍是单点（可做高可用主从），ID 暴露业务量（连续号）。`);

  // ── 分库分表 ────────────────────────────────────────────────────────────────────

  const shardingCode = `// 分库分表场景：ID 必须能反推路由，否则跨库查询灾难
// 错误做法：UUID（无法路由）
// 正确做法：雪花算法或预埋分片位

// 案例 1：雪花算法 ID，按 workerId 路由
//   workerId 直接对应分库编号 → 任意 ID 反推所属库

// 案例 2：订单号设计 = 业务位 + 分库位 + 雪花
//   订单号: 0 1 05 17723456789012345
//         ↑ ↑ ↑  ↑
//       版本 业务分库年份 雪花主体
//   路由时解析分库位 → DB_05 表`;

  const shardingBlock = codeBlock('ID 设计要考虑分库分表', 'dot-yellow', 'java', shardingCode);

  // ── 选型建议 ────────────────────────────────────────────────────────────────────

  const selectionBox = ruleBox('success',
    `<strong>实战选型：</strong><br><br>
    • <strong>内部 traceId / 文件名</strong>：UUID（无需递增）<br>
    • <strong>中小项目订单号</strong>：数据库号段（Leaf）<br>
    • <strong>高并发大厂订单号</strong>：Snowflake / Leaf-Snowflake<br>
    • <strong>短时间海量临时 ID</strong>：Redis INCR（如秒杀排队号）<br>
    • <strong>对外暴露业务量敏感</strong>：Snowflake（非连续）+ 加密短链<br><br>
    一句话：<strong>能本地生成就不要远程生成，但要注意时钟与机器 ID 分配。</strong>`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('ID 的需求维度', requireTable)}
    ${section('方案对比', planTable)}
    ${section('雪花算法：64 位结构', snowflakeBox + snowflakeBlock)}
    ${section('时钟回拨：雪花的致命问题', clockBox)}
    ${section('Leaf 号段：DB + 本地缓存', leafBlock + leafNote)}
    ${section('分库分表的考量', shardingBlock)}
    ${section('选型建议', selectionBox)}`);
}
