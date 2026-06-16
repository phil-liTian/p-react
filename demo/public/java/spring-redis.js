function renderSpringRedis(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>Spring Boot 整合 Redis 的三种主要用法：</strong><br><br>
    <strong>① RedisTemplate</strong>——底层 API，操作所有数据结构（String / Hash / List / Set / ZSet），灵活但稍繁琐<br>
    <strong>② Spring Cache（@Cacheable）</strong>——声明式缓存注解，零侵入地给方法加缓存，最常用<br>
    <strong>③ 分布式锁（Redisson）</strong>——多实例部署时替代 synchronized，基于 Redis 实现跨进程互斥<br><br>
    前端类比：Redis 就是服务端版的 <code>sessionStorage</code>（有过期时间）+ <code>Map</code>（支持多种数据结构），但可以跨进程、跨机器共享。`);

  // ── 依赖配置 ──────────────────────────────────────────────────────────────────

  const depConfig = `<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<!-- 连接池（推荐 Lettuce，Spring Boot 默认） -->
<dependency>
  <groupId>org.apache.commons</groupId>
  <artifactId>commons-pool2</artifactId>
</dependency>`;

  const ymlConfig = `# application.yml
spring:
  redis:
    host: localhost
    port: 6379
    password: your_password   # 无密码则删除此行
    database: 0
    lettuce:
      pool:
        max-active: 8         # 最大连接数
        max-idle: 8
        min-idle: 0
        max-wait: -1ms        # -1 表示无限等待`;

  const configPair = codeBlocksRow([
    codeBlock('pom.xml 依赖', 'dot-orange', 'xml', depConfig),
    codeBlock('application.yml 配置', 'dot-blue', 'yaml', ymlConfig),
  ]);

  // ── RedisTemplate 序列化配置 ──────────────────────────────────────────────────

  const serializerBox = ruleBox('warning',
    `<strong>必须配置序列化，否则 Redis 中的 key/value 是乱码</strong><br><br>
    默认的 <code>JdkSerializationRedisSerializer</code> 会把 key 序列化成二进制乱码。
    推荐 key 用 <code>StringRedisSerializer</code>，value 用 <code>Jackson2JsonRedisSerializer</code>（可读性好，支持对象存取）。`);

  const serializerConfig = `@Configuration
public class RedisConfig {

  @Bean
  public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
    RedisTemplate<String, Object> template = new RedisTemplate<>();
    template.setConnectionFactory(factory);

    Jackson2JsonRedisSerializer<Object> jsonSerializer =
        new Jackson2JsonRedisSerializer<>(Object.class);

    ObjectMapper om = new ObjectMapper();
    om.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
    om.activateDefaultTyping(
        LaissezFaireSubTypeValidator.instance,
        ObjectMapper.DefaultTyping.NON_FINAL);
    jsonSerializer.setObjectMapper(om);

    // key 用字符串，value 用 JSON
    template.setKeySerializer(new StringRedisSerializer());
    template.setValueSerializer(jsonSerializer);
    template.setHashKeySerializer(new StringRedisSerializer());
    template.setHashValueSerializer(jsonSerializer);
    template.afterPropertiesSet();
    return template;
  }
}`;

  const serializerBlock = codeBlock('RedisConfig.java——序列化配置', 'dot-orange', 'java', serializerConfig);

  // ── RedisTemplate 常用操作 ────────────────────────────────────────────────────

  const opsCode = `@Service
@RequiredArgsConstructor
public class RedisService {

  private final RedisTemplate<String, Object> redisTemplate;

  // ── String 操作（最常用）─────────────────────────────────
  public void set(String key, Object value, long seconds) {
    redisTemplate.opsForValue().set(key, value, seconds, TimeUnit.SECONDS);
  }

  public Object get(String key) {
    return redisTemplate.opsForValue().get(key);
  }

  public Boolean delete(String key) {
    return redisTemplate.delete(key);
  }

  public Boolean hasKey(String key) {
    return redisTemplate.hasKey(key);
  }

  // 原子自增（计数器、限流）
  public Long increment(String key, long delta) {
    return redisTemplate.opsForValue().increment(key, delta);
  }

  // ── Hash 操作（存对象字段，节省序列化开销）────────────────
  public void hSet(String key, String field, Object value) {
    redisTemplate.opsForHash().put(key, field, value);
  }

  public Object hGet(String key, String field) {
    return redisTemplate.opsForHash().get(key, field);
  }

  public Map<Object, Object> hGetAll(String key) {
    return redisTemplate.opsForHash().entries(key);
  }

  // ── List 操作（消息队列、最近浏览）──────────────────────
  public void lPush(String key, Object value) {
    redisTemplate.opsForList().leftPush(key, value);  // 从左插入
  }

  public Object rPop(String key) {
    return redisTemplate.opsForList().rightPop(key);  // 从右弹出（FIFO）
  }

  // ── ZSet 操作（排行榜）──────────────────────────────────
  public void zAdd(String key, Object member, double score) {
    redisTemplate.opsForZSet().add(key, member, score);
  }

  // 获取 top N（score 从高到低）
  public Set<Object> zTopN(String key, long n) {
    return redisTemplate.opsForZSet().reverseRange(key, 0, n - 1);
  }
}`;

  const opsBlock = codeBlock('RedisService.java——常用操作封装', 'dot-blue', 'java', opsCode);

  // ── Spring Cache 声明式缓存 ───────────────────────────────────────────────────

  const cacheBox = ruleBox('success',
    `<strong>@Cacheable / @CacheEvict——零侵入声明式缓存</strong><br><br>
    不需要手写 Redis 存取逻辑，Spring 自动在方法调用前后操作缓存：<br>
    • <code>@Cacheable</code>：有缓存就返回缓存，没有则执行方法并把结果存入缓存<br>
    • <code>@CachePut</code>：总是执行方法，并把结果更新到缓存（写操作用）<br>
    • <code>@CacheEvict</code>：执行方法后删除对应缓存（删/改操作用）`);

  const cacheEnableCode = `// 启动类或配置类开启缓存
@SpringBootApplication
@EnableCaching
public class Application { ... }

// application.yml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 600000  # 默认过期时间，毫秒（10分钟）`;

  const cacheUsageCode = `@Service
@RequiredArgsConstructor
public class UserService {

  private final UserMapper userMapper;

  // ① 查询：有缓存直接返回，无缓存则查 DB 并写入缓存
  // key = "user::1"（cacheName + "::" + SpEL 表达式）
  @Cacheable(value = "user", key = "#id")
  public User getById(Long id) {
    return userMapper.selectById(id);  // 缓存命中时此行不执行
  }

  // ② 更新：执行方法后把新值写入缓存（保持缓存最新）
  @CachePut(value = "user", key = "#user.id")
  public User update(User user) {
    userMapper.updateById(user);
    return user;  // 返回值会被存入缓存
  }

  // ③ 删除：执行方法后删除缓存（下次查询重新走 DB）
  @CacheEvict(value = "user", key = "#id")
  public void delete(Long id) {
    userMapper.deleteById(id);
  }

  // ④ 清空整个 cacheName 下所有缓存
  @CacheEvict(value = "user", allEntries = true)
  public void clearAllCache() { }
}`;

  const cachePair = codeBlocksRow([
    codeBlock('开启缓存配置', 'dot-orange', 'yaml', cacheEnableCode),
    codeBlock('@Cacheable / @CacheEvict 用法', 'dot-green', 'java', cacheUsageCode),
  ]);

  // ── 分布式锁 ─────────────────────────────────────────────────────────────────

  const lockBox = ruleBox('warning',
    `<strong>分布式锁——多实例部署时的跨进程互斥</strong><br><br>
    单体应用用 <code>synchronized</code> 就够了。多实例部署（多台服务器）时，每个 JVM 进程有自己的内存，<code>synchronized</code> 只能锁住本进程内的线程，无法跨进程互斥。<br><br>
    需要用 <strong>Redis 分布式锁</strong>来协调多个进程：推荐使用 <strong>Redisson</strong>（封装了 SETNX + 看门狗续期 + Lua 原子解锁，避免手写出错）。`);

  const redissonDep = `<!-- pom.xml：Redisson Spring Boot Starter -->
<dependency>
  <groupId>org.redisson</groupId>
  <artifactId>redisson-spring-boot-starter</artifactId>
  <version>3.27.0</version>
</dependency>`;

  const redissonCode = `@Service
@RequiredArgsConstructor
public class StockService {

  private final RedissonClient redissonClient;
  private final StockMapper stockMapper;

  public void deductStock(Long productId, int quantity) {
    // 锁的 key 通常包含业务 ID，避免不同商品互相阻塞
    String lockKey = "lock:stock:" + productId;
    RLock lock = redissonClient.getLock(lockKey);

    // tryLock(等待时间, 锁超时时间, 时间单位)
    // 等待时间：获取不到锁时最多等 3 秒
    // 锁超时：防止宕机后锁永不释放（看门狗会自动续期）
    boolean acquired = false;
    try {
      acquired = lock.tryLock(3, 10, TimeUnit.SECONDS);
      if (!acquired) {
        throw new ServiceException("操作频繁，请稍后重试");
      }
      // ── 临界区：只有一个实例能同时执行这里 ──
      Stock stock = stockMapper.selectById(productId);
      if (stock.getQuantity() < quantity) {
        throw new ServiceException("库存不足");
      }
      stock.setQuantity(stock.getQuantity() - quantity);
      stockMapper.updateById(stock);

    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new ServiceException("获取锁被中断");
    } finally {
      // 只有当前线程持有锁才释放（Redisson 自动校验）
      if (acquired && lock.isHeldByCurrentThread()) {
        lock.unlock();
      }
    }
  }
}`;

  const lockPair = codeBlocksRow([
    codeBlock('pom.xml Redisson 依赖', 'dot-orange', 'xml', redissonDep),
    codeBlock('分布式锁使用示例', 'dot-red', 'java', redissonCode),
  ]);

  // ── 常见场景速查 ──────────────────────────────────────────────────────────────

  const scenarioRows = [
    ['缓存用户/商品信息',  '@Cacheable + @CacheEvict',         '查多写少，减少 DB 压力'],
    ['接口限流（计数器）', 'opsForValue().increment() + 过期',  '每分钟最多 N 次请求'],
    ['Session 共享',      'spring-session-data-redis',         '多实例登录状态共享'],
    ['排行榜',            'opsForZSet().add() + reverseRange()', 'ZSet score 即排序字段'],
    ['消息队列（简单）',  'opsForList().leftPush/rightPop()',   '轻量任务队列，不需要 MQ'],
    ['分布式锁',          'Redisson RLock',                    '库存扣减、重复提交防护'],
  ];

  const scenarioHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1fr 1.6fr 1.8fr">
      <div class="compare-card-header-cell frontend">场景</div>
      <div class="compare-card-header-cell java">方案</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const scenarioRowsHtml = scenarioRows.map(([scene, solution, note]) => `
    <div class="compare-card-row" style="grid-template-columns: 1fr 1.6fr 1.8fr">
      <div class="compare-card-cell frontend">${escHtml(scene)}</div>
      <div class="compare-card-cell java">${escHtml(solution)}</div>
      <div class="compare-card-cell desc">${escHtml(note)}</div>
    </div>`).join('');

  const scenarioTable = `<div class="compare-card">${scenarioHeaderHtml}${scenarioRowsHtml}</div>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('依赖与连接配置', configPair)}
    ${section('RedisTemplate 序列化配置（必做）', serializerBox + serializerBlock)}
    ${section('RedisTemplate 常用操作', opsBlock)}
    ${section('Spring Cache 声明式缓存', cacheBox + cachePair)}
    ${section('分布式锁（Redisson）', lockBox + lockPair)}
    ${section('常见场景速查', scenarioTable)}`);
}
