function renderRedisCacheProblems(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>缓存三大问题一句话区分：</strong><br><br>
    <strong>① 缓存穿透</strong>——查询<em>根本不存在</em>的数据，缓存永远命不中，每次都打到数据库<br>
    <strong>② 缓存击穿</strong>——某个<em>热点 key 过期</em>瞬间，大量并发请求同时穿透到数据库<br>
    <strong>③ 缓存雪崩</strong>——大批 key <em>同一时间过期</em>，或 Redis 宕机，导致数据库被洪峰压垮<br><br>
    前端类比：穿透 = 请求了一个 404 接口却没做缓存；击穿 = 热门接口缓存刚过期被大量并发打爆；雪崩 = sessionStorage 突然全清空，所有接口同时回源。`);

  // ── 对比速查表 ────────────────────────────────────────────────────────────────

  const compareRows = [
    ['缓存穿透', '查询不存在的 key，缓存无法拦截', '① 空值缓存（null 也缓存）<br>② 布隆过滤器'],
    ['缓存击穿', '热点 key 过期，瞬时并发打穿 DB', '① 互斥锁（重建时只允许一个线程）<br>② 逻辑过期（热点 key 永不过期）'],
    ['缓存雪崩', '大批 key 同时过期 或 Redis 宕机', '① TTL 加随机抖动<br>② 多级缓存（本地 + Redis）<br>③ Redis 集群 / 主从高可用'],
  ];

  const tableHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1fr 1.8fr 2.2fr">
      <div class="compare-card-header-cell frontend">问题</div>
      <div class="compare-card-header-cell java">根本原因</div>
      <div class="compare-card-header-cell desc">解决方案</div>
    </div>`;

  const tableRowsHtml = compareRows.map(([prob, cause, solution]) => `
    <div class="compare-card-row" style="grid-template-columns: 1fr 1.8fr 2.2fr">
      <div class="compare-card-cell frontend">${escHtml(prob)}</div>
      <div class="compare-card-cell java">${escHtml(cause)}</div>
      <div class="compare-card-cell desc">${solution}</div>
    </div>`).join('');

  const overviewTable = `<div class="compare-card">${tableHeaderHtml}${tableRowsHtml}</div>`;

  // ── 缓存穿透 ──────────────────────────────────────────────────────────────────

  const penetrationBox = ruleBox('warning',
    `<strong>缓存穿透：查不存在的数据</strong><br><br>
    攻击者（或 bug）用大量不存在的 ID 发请求，Redis 永远 miss，每次都穿透到 DB。<br>
    两种方案：<strong>空值缓存</strong>实现简单但会污染缓存；<strong>布隆过滤器</strong>内存极省但有一定误判率，不支持删除（用 Counting Bloom Filter 可解决）。`);

  const nullCacheCode = `@Service
@RequiredArgsConstructor
public class ProductService {

  private final StringRedisTemplate redisTemplate;
  private final ProductMapper productMapper;

  private static final String CACHE_NULL = "";   // 空值占位符
  private static final long NULL_TTL = 2;        // 空值缓存 2 分钟，避免长期污染

  public Product getById(Long id) {
    String key = "product:" + id;
    String cached = redisTemplate.opsForValue().get(key);

    if (cached != null) {
      // 命中缓存：空字符串表示数据不存在
      return CACHE_NULL.equals(cached) ? null : JSON.parseObject(cached, Product.class);
    }

    // 缓存未命中，查数据库
    Product product = productMapper.selectById(id);
    if (product == null) {
      // 数据不存在：缓存空值，防止穿透
      redisTemplate.opsForValue().set(key, CACHE_NULL, NULL_TTL, TimeUnit.MINUTES);
      return null;
    }

    redisTemplate.opsForValue().set(key, JSON.toJSONString(product), 30, TimeUnit.MINUTES);
    return product;
  }
}`;

  const bloomCode = `// 布隆过滤器方案（基于 Redisson）
@Component
@RequiredArgsConstructor
public class BloomFilterHelper {

  private final RedissonClient redissonClient;

  // 预热：项目启动时把所有合法 ID 加入过滤器
  @PostConstruct
  public void init() {
    RBloomFilter<Long> filter = redissonClient.getBloomFilter("product:bloom");
    // 预期元素数量 100 万，误判率 0.01%
    filter.tryInit(1_000_000L, 0.001);

    // 从 DB 加载所有合法 ID
    productMapper.selectAllIds().forEach(filter::add);
  }

  public boolean mightExist(Long id) {
    RBloomFilter<Long> filter = redissonClient.getBloomFilter("product:bloom");
    return filter.contains(id);  // false = 一定不存在，可直接拦截
  }
}

// Service 中使用
public Product getById(Long id) {
  // 布隆过滤器前置拦截
  if (!bloomFilterHelper.mightExist(id)) {
    return null;  // 直接返回，不查缓存和 DB
  }
  // ... 正常缓存逻辑
}`;

  const penetrationPair = codeBlocksRow([
    codeBlock('方案一：空值缓存', 'dot-blue', 'java', nullCacheCode),
    codeBlock('方案二：布隆过滤器（Redisson）', 'dot-green', 'java', bloomCode),
  ]);

  // ── 缓存击穿 ──────────────────────────────────────────────────────────────────

  const breakdownBox = ruleBox('warning',
    `<strong>缓存击穿：热点 key 过期瞬间被并发打穿</strong><br><br>
    热点数据（如秒杀商品、首页 banner）过期的一瞬间，可能有成千上万个请求同时发现缓存 miss，全部涌向 DB 重建缓存。<br>
    <strong>互斥锁方案</strong>：只让一个线程重建，其余线程等待——简单但等待期间无数据返回；<br>
    <strong>逻辑过期方案</strong>：热点 key 永不过期，在 value 里存过期时间，异步重建——无等待但会短暂返回旧数据。`);

  const mutexCode = `public Product getByIdWithMutex(Long id) {
  String key = "product:" + id;
  String cached = redisTemplate.opsForValue().get(key);
  if (cached != null) {
    return JSON.parseObject(cached, Product.class);
  }

  // 获取互斥锁（SETNX，只有一个线程能成功）
  String lockKey = "lock:product:" + id;
  try {
    boolean locked = tryLock(lockKey);
    if (!locked) {
      // 获取锁失败：短暂休眠后重试（自旋等待）
      Thread.sleep(50);
      return getByIdWithMutex(id);
    }

    // 获取锁成功：再次检查缓存（double check，防止重复重建）
    cached = redisTemplate.opsForValue().get(key);
    if (cached != null) return JSON.parseObject(cached, Product.class);

    // 重建缓存
    Product product = productMapper.selectById(id);
    redisTemplate.opsForValue().set(key, JSON.toJSONString(product), 30, TimeUnit.MINUTES);
    return product;

  } catch (InterruptedException e) {
    Thread.currentThread().interrupt();
    throw new ServiceException("查询被中断");
  } finally {
    unlock(lockKey);
  }
}

private boolean tryLock(String key) {
  // SET key 1 NX EX 10（原子操作，10 秒后自动释放防死锁）
  Boolean ok = redisTemplate.opsForValue()
      .setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
  return Boolean.TRUE.equals(ok);
}

private void unlock(String key) {
  redisTemplate.delete(key);
}`;

  const logicalExpireCode = `// 包装类：在 value 中存逻辑过期时间
@Data
public class RedisData {
  private LocalDateTime expireTime;
  private Object data;
}

// 线程池用于异步重建缓存
private static final ExecutorService CACHE_REBUILD_POOL =
    Executors.newFixedThreadPool(10);

public Product getByIdWithLogicalExpire(Long id) {
  String key = "product:" + id;
  String cached = redisTemplate.opsForValue().get(key);

  // 热点 key 启动时预热写入，理论上不会 miss
  if (cached == null) return null;

  RedisData redisData = JSON.parseObject(cached, RedisData.class);
  Product product = JSON.parseObject(
      JSON.toJSONString(redisData.getData()), Product.class);

  // 未过期：直接返回
  if (redisData.getExpireTime().isAfter(LocalDateTime.now())) {
    return product;
  }

  // 已过期：尝试获取互斥锁，异步重建
  String lockKey = "lock:product:" + id;
  if (tryLock(lockKey)) {
    CACHE_REBUILD_POOL.submit(() -> {
      try {
        Product fresh = productMapper.selectById(id);
        RedisData newData = new RedisData();
        newData.setData(fresh);
        newData.setExpireTime(LocalDateTime.now().plusMinutes(30));
        // 不设 TTL，永久存储（逻辑过期控制）
        redisTemplate.opsForValue().set(key, JSON.toJSONString(newData));
      } finally {
        unlock(lockKey);
      }
    });
  }

  // 返回旧数据（重建完成前短暂不一致）
  return product;
}`;

  const breakdownPair = codeBlocksRow([
    codeBlock('方案一：互斥锁（强一致，有等待）', 'dot-orange', 'java', mutexCode),
    codeBlock('方案二：逻辑过期（高可用，短暂旧数据）', 'dot-blue', 'java', logicalExpireCode),
  ]);

  // ── 缓存雪崩 ──────────────────────────────────────────────────────────────────

  const avalancheBox = ruleBox('danger',
    `<strong>缓存雪崩：大批 key 同时失效 或 Redis 宕机</strong><br><br>
    两种触发场景：<br>
    <strong>① 集中过期</strong>：批量写入缓存时 TTL 设成相同值，同一时刻全部过期，DB 瞬间被打满<br>
    <strong>② Redis 宕机</strong>：整个缓存层不可用，所有流量直接压到 DB<br><br>
    对应策略：① 用随机抖动分散过期时间；② 本地缓存（Caffeine）兜底 + Redis 集群保障高可用。`);

  const jitterCode = `@Service
@RequiredArgsConstructor
public class CacheService {

  private final StringRedisTemplate redisTemplate;
  private final Random random = new Random();

  // 基础 TTL + 随机抖动，避免大批 key 同时过期
  public void setWithJitter(String key, Object value, long baseTtlMinutes) {
    // 在基础 TTL 上随机增加 0~10 分钟
    long jitter = random.nextInt(10);
    long ttl = baseTtlMinutes + jitter;
    redisTemplate.opsForValue().set(key, JSON.toJSONString(value), ttl, TimeUnit.MINUTES);
  }

  // 批量写入时，每个 key 的 TTL 都不同
  public void batchSet(Map<String, Object> items, long baseTtlMinutes) {
    items.forEach((key, value) -> setWithJitter(key, value, baseTtlMinutes));
  }
}`;

  const localCacheCode = `// 多级缓存：本地 Caffeine + Redis
// pom.xml: spring-boot-starter-cache + caffeine
@Configuration
@EnableCaching
public class CacheConfig {

  @Bean
  public CacheManager cacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager();
    manager.setCaffeine(
      Caffeine.newBuilder()
        .expireAfterWrite(5, TimeUnit.MINUTES)  // 本地缓存 5 分钟
        .maximumSize(1000)                       // 最多缓存 1000 条
    );
    return manager;
  }
}

// Service：先查本地缓存，再查 Redis，最后查 DB
@Service
@RequiredArgsConstructor
public class ProductService {

  @Cacheable(value = "product", key = "#id")  // 命中本地缓存直接返回
  public Product getById(Long id) {
    // 本地缓存 miss → 查 Redis
    String key = "product:" + id;
    String cached = redisTemplate.opsForValue().get(key);
    if (cached != null) return JSON.parseObject(cached, Product.class);

    // Redis miss → 查 DB（Redis 宕机时的兜底）
    Product product = productMapper.selectById(id);
    if (product != null) {
      redisTemplate.opsForValue().set(key, JSON.toJSONString(product),
          30 + new Random().nextInt(10), TimeUnit.MINUTES);
    }
    return product;
  }
}`;

  const avalanchePair = codeBlocksRow([
    codeBlock('TTL 随机抖动（分散过期）', 'dot-blue', 'java', jitterCode),
    codeBlock('多级缓存（Caffeine + Redis）', 'dot-green', 'java', localCacheCode),
  ]);

  // ── 方案选型建议 ──────────────────────────────────────────────────────────────

  const selectionBox = ruleBox('success',
    `<strong>实际开发选型建议</strong><br><br>
    <strong>缓存穿透</strong>：优先用<strong>空值缓存</strong>，简单零依赖；只有当非法 ID 攻击量极大（空值缓存会撑爆内存）时，才引入布隆过滤器。<br><br>
    <strong>缓存击穿</strong>：数据一致性要求高（如金融）→ <strong>互斥锁</strong>；并发量极高且允许短暂旧数据（如商品详情页）→ <strong>逻辑过期</strong>。<br><br>
    <strong>缓存雪崩</strong>：<strong>TTL 加随机抖动</strong>是必做项，几乎零成本；生产环境必须部署 <strong>Redis 主从 + 哨兵 / Cluster</strong> 保障高可用；本地缓存作为最后一道防线，仅用于读多写少的场景。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('三大问题对比速查', overviewTable)}
    ${section('缓存穿透', penetrationBox + penetrationPair)}
    ${section('缓存击穿', breakdownBox + breakdownPair)}
    ${section('缓存雪崩', avalancheBox + avalanchePair)}
    ${section('方案选型建议', selectionBox)}`);
}
