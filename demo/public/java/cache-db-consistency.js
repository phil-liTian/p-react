function renderCacheDbConsistency(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>缓存与数据库双写一致性核心结论：</strong><br><br>
    没有一种方案能同时做到<strong>高性能</strong>与<strong>强一致性</strong>，只能在「性能、一致性、复杂度」三者间取舍。<br><br>
    主流方案优先级：<strong>Cache-Aside（旁路缓存）</strong> 是绝大多数业务的首选；<strong>延迟双删</strong>是对它的加固；
    强一致场景才考虑 <strong>Canal 监听 Binlog 异步同步</strong>（最终一致）或引入分布式事务（成本极高，慎用）。`);

  // ── 四种方案对比 ──────────────────────────────────────────────────────────────

  const compareRows = [
    ['Cache-Aside', '先更新 DB，再删缓存', '⭐⭐⭐⭐', '小概率不一致（并发读写窗口）'],
    ['延迟双删', '删缓存→更新 DB→延迟再删', '⭐⭐⭐', '延迟时间难以精确控制'],
    ['Write-Through', '同步更新 DB + 缓存', '⭐⭐⭐⭐⭐', '写性能下降，复杂度高'],
    ['Canal Binlog', '更新 DB，异步监听 Binlog 更新缓存', '⭐⭐⭐', '最终一致，有短暂延迟'],
  ];

  const tableHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1.2fr 2fr 1fr 2fr">
      <div class="compare-card-header-cell frontend">方案</div>
      <div class="compare-card-header-cell java">操作顺序</div>
      <div class="compare-card-header-cell desc">一致性</div>
      <div class="compare-card-header-cell desc">主要缺点</div>
    </div>`;

  const tableRowsHtml = compareRows.map(([name, order, consistency, cons]) => `
    <div class="compare-card-row" style="grid-template-columns: 1.2fr 2fr 1fr 2fr">
      <div class="compare-card-cell frontend">${escHtml(name)}</div>
      <div class="compare-card-cell java">${escHtml(order)}</div>
      <div class="compare-card-cell desc">${escHtml(consistency)}</div>
      <div class="compare-card-cell desc">${escHtml(cons)}</div>
    </div>`).join('');

  const overviewTable = `<div class="compare-card">${tableHeaderHtml}${tableRowsHtml}</div>`;

  // ── Cache-Aside（旁路缓存）────────────────────────────────────────────────────

  const cacheAsideBox = ruleBox('success',
    `<strong>Cache-Aside（旁路缓存）—— 首选方案</strong><br><br>
    读：先查缓存，miss 再查 DB，然后回写缓存。<br>
    写：<strong>先更新 DB，再删除缓存</strong>（不是更新缓存）。<br><br>
    为什么是「删除」而不是「更新」缓存？更新缓存在并发写场景下会有<strong>写写竞争</strong>问题——两个线程先后更新 DB，但更新缓存的顺序可能反转，导致缓存值比 DB 旧。删除缓存后，下一次读时重新从 DB 加载，天然避免竞争。`);

  const cacheAsideCode = `@Service
@RequiredArgsConstructor
public class ProductService {

  private final StringRedisTemplate redisTemplate;
  private final ProductMapper productMapper;
  private static final long TTL_MINUTES = 30;

  // 读：Cache-Aside 读取
  public Product getById(Long id) {
    String key = "product:" + id;

    // 1. 查缓存
    String cached = redisTemplate.opsForValue().get(key);
    if (cached != null) {
      return JSON.parseObject(cached, Product.class);
    }

    // 2. 缓存 miss → 查 DB
    Product product = productMapper.selectById(id);
    if (product == null) return null;

    // 3. 回写缓存
    redisTemplate.opsForValue().set(key, JSON.toJSONString(product),
        TTL_MINUTES, TimeUnit.MINUTES);
    return product;
  }

  // 写：先更新 DB，再删除缓存
  @Transactional
  public void updateProduct(Product product) {
    // 1. 更新数据库
    productMapper.updateById(product);

    // 2. 删除缓存（而非更新，避免并发写写竞争）
    redisTemplate.delete("product:" + product.getId());
  }
}`;

  const cacheAsideRiskCode = `// ⚠️ Cache-Aside 的小概率不一致场景（了解即可，TTL 兜底足够）
//
// 时序：
// T1: 线程 A 读缓存 miss，查 DB 得到旧值（还没回写）
// T2: 线程 B 更新 DB，删除缓存（成功）
// T3: 线程 A 将旧值回写缓存（覆盖了 B 的删除！）
// 结果：缓存里是旧值，DB 里是新值
//
// 发生概率极低（需要 DB 读操作比 DB 写操作更慢，违反常规）
// 兜底手段：设置合理 TTL，让旧缓存自然过期即可
//
// 如果必须强一致：考虑在回写缓存时加 version 校验
redisTemplate.opsForValue().setIfAbsent(key, json, TTL_MINUTES, TimeUnit.MINUTES);
// setIfAbsent = SETNX：只在 key 不存在时才写入，
// 避免 A 的旧值覆盖 B 已删除的空缓存`;

  const cacheAsidePair = codeBlocksRow([
    codeBlock('Cache-Aside 标准实现', 'dot-green', 'java', cacheAsideCode),
    codeBlock('⚠️ 小概率不一致分析', 'dot-yellow', 'java', cacheAsideRiskCode),
  ]);

  // ── 延迟双删 ──────────────────────────────────────────────────────────────────

  const delayDoubleDeleteBox = ruleBox('warning',
    `<strong>延迟双删 —— 对 Cache-Aside 的加固</strong><br><br>
    操作顺序：<strong>① 先删缓存 → ② 更新 DB → ③ 延迟一段时间再删一次缓存</strong><br><br>
    第一次删缓存：清除更新前的旧缓存。<br>
    更新 DB：写入新数据。<br>
    延迟再删：清除在「更新 DB 过程中」其他线程可能回写的旧缓存（窗口期内的旧值）。<br><br>
    <strong>缺点</strong>：延迟时长难以精确——延迟太短，旧缓存还没回写完；延迟太长，一致性窗口变大，且需要引入异步线程或消息队列。`);

  const delayDoubleDeleteCode = `@Service
@RequiredArgsConstructor
public class ProductService {

  private final StringRedisTemplate redisTemplate;
  private final ProductMapper productMapper;

  // 异步线程池，用于延迟第二次删除
  private static final ScheduledExecutorService SCHEDULER =
      Executors.newScheduledThreadPool(2);

  @Transactional
  public void updateProduct(Product product) {
    String key = "product:" + product.getId();

    // 第一步：先删缓存（清除更新前的旧值）
    redisTemplate.delete(key);

    // 第二步：更新数据库
    productMapper.updateById(product);

    // 第三步：延迟 500ms 再删一次缓存
    // 目的：清除「更新 DB 期间」其他线程回写进来的旧缓存
    // 延迟时长 = 预估的读线程回写缓存所需时间（通常 200ms~1s）
    SCHEDULER.schedule(() -> {
      redisTemplate.delete(key);
    }, 500, TimeUnit.MILLISECONDS);
  }
}`;

  const delayDoubleDeleteMQCode = `// 生产级：用消息队列替代 ScheduledExecutor，更可靠
@Service
@RequiredArgsConstructor
public class ProductService {

  private final StringRedisTemplate redisTemplate;
  private final ProductMapper productMapper;
  private final RabbitTemplate rabbitTemplate;  // 或 KafkaTemplate

  @Transactional
  public void updateProduct(Product product) {
    String key = "product:" + product.getId();

    // 1. 先删缓存
    redisTemplate.delete(key);

    // 2. 更新 DB
    productMapper.updateById(product);

    // 3. 发送延迟消息（延迟 500ms 后消费者再删一次缓存）
    // RabbitMQ 死信队列 / RocketMQ 延迟消息 / Redis ZSet 实现延迟队列
    CacheDeleteMessage msg = new CacheDeleteMessage(key, System.currentTimeMillis());
    rabbitTemplate.convertAndSend("cache.delay.exchange", "cache.delete", msg,
        m -> { m.getMessageProperties().setDelay(500); return m; });
  }
}

// 消费者
@RabbitListener(queues = "cache.delete.queue")
public void handleCacheDelete(CacheDeleteMessage msg) {
  redisTemplate.delete(msg.getCacheKey());
  log.info("延迟删缓存成功: {}", msg.getCacheKey());
}`;

  const delayDoubleDeletePair = codeBlocksRow([
    codeBlock('延迟双删（ScheduledExecutor）', 'dot-orange', 'java', delayDoubleDeleteCode),
    codeBlock('生产级：延迟双删 + 消息队列', 'dot-blue', 'java', delayDoubleDeleteMQCode),
  ]);

  // ── Canal Binlog 异步同步 ─────────────────────────────────────────────────────

  const canalBox = ruleBox('info',
    `<strong>Canal 监听 Binlog —— 最终一致，业务代码零侵入</strong><br><br>
    原理：Canal 伪装成 MySQL 从库，监听主库的 <code>Binlog</code> 变更事件，解析后发到 MQ，消费者再更新或删除 Redis 缓存。<br><br>
    优点：<strong>业务代码完全不需要手动操作缓存</strong>，DB 更新即自动同步缓存，解耦彻底。<br>
    缺点：引入 Canal + MQ 两个中间件，运维成本高；Binlog 同步有毫秒级延迟（最终一致而非强一致）；Canal 本身需要高可用部署。<br><br>
    适用场景：数据变更频率高、来源多（多个服务都会改同一张表）、业务代码解耦优先级高的场景。`);

  const canalArchCode = `// Canal 架构（配置层，不是业务代码）
//
// MySQL（开启 Binlog row 模式）
//   → Canal Server（伪装从库，监听 Binlog）
//   → MQ（RocketMQ / Kafka / RabbitMQ）
//   → Canal Consumer（消费者更新 Redis）
//
// MySQL 配置（my.cnf）：
// [mysqld]
// log-bin=mysql-bin
// binlog-format=ROW
// server-id=1
//
// Canal Server 配置（instance.properties）：
// canal.instance.master.address=127.0.0.1:3306
// canal.instance.dbUsername=canal
// canal.instance.dbPassword=canal
// canal.instance.filter.regex=shop\\.product  # 只监听 shop 库 product 表`;

  const canalConsumerCode = `// Canal 消费者：接收 Binlog 变更事件，更新 Redis
@Component
@RequiredArgsConstructor
@RabbitListener(queues = "canal.product.queue")
public class ProductCacheConsumer {

  private final StringRedisTemplate redisTemplate;
  private final ProductMapper productMapper;

  public void handleBinlogEvent(CanalBinlogEvent event) {
    String tableName = event.getTable();
    if (!"product".equals(tableName)) return;

    for (Map<String, Object> row : event.getData()) {
      Long id = Long.parseLong(row.get("id").toString());
      String key = "product:" + id;

      switch (event.getType()) {
        case "INSERT":
        case "UPDATE":
          // 重新从 DB 查最新值写入缓存（或直接用 Binlog 里的新值）
          Product product = productMapper.selectById(id);
          if (product != null) {
            redisTemplate.opsForValue().set(
                key, JSON.toJSONString(product), 30, TimeUnit.MINUTES);
          }
          break;

        case "DELETE":
          redisTemplate.delete(key);
          break;
      }
    }
  }
}`;

  const canalPair = codeBlocksRow([
    codeBlock('Canal 架构与 MySQL 配置', 'dot-blue', 'java', canalArchCode),
    codeBlock('Canal 消费者：更新 Redis 缓存', 'dot-green', 'java', canalConsumerCode),
  ]);

  // ── 常见误区 ──────────────────────────────────────────────────────────────────

  const pitfall1 = ruleBox('danger',
    `<strong>误区一：先更新缓存，再更新 DB</strong><br><br>
    如果 DB 更新失败（事务回滚），缓存里已经是新值，DB 里还是旧值——<strong>缓存和 DB 永久不一致</strong>，且无法感知。<br>
    正确顺序：<strong>DB 操作永远先行</strong>，DB 成功后再处理缓存。`);

  const pitfall2 = ruleBox('danger',
    `<strong>误区二：更新 DB 后更新缓存（而非删除）</strong><br><br>
    并发写场景：线程 A、B 同时更新同一条记录，A 先写 DB，B 后写 DB，但 B 先更新缓存、A 后更新缓存——缓存里是 A 的旧值，DB 里是 B 的新值。<br>
    正确做法：<strong>删除缓存</strong>，而不是更新缓存。下次读时从 DB 重新加载最新值。`);

  const pitfall3 = ruleBox('warning',
    `<strong>误区三：缓存删除失败没有补偿</strong><br><br>
    网络抖动可能导致 <code>redisTemplate.delete(key)</code> 抛异常。如果没有重试机制，缓存里会一直是旧值直到 TTL 过期。<br>
    生产建议：捕获删除异常，写入<strong>重试队列</strong>（Redis List 或 MQ），异步重试删除；同时确保缓存设置了合理 TTL 作为最终兜底。`);

  // ── 方案选型 ──────────────────────────────────────────────────────────────────

  const selectionBox = ruleBox('success',
    `<strong>方案选型指南</strong><br><br>
    <strong>90% 的业务场景</strong>：Cache-Aside（先更新 DB，再删缓存）+ 合理 TTL 兜底。简单、可靠、够用。<br><br>
    <strong>并发写入较高、对短暂不一致敏感</strong>：在 Cache-Aside 基础上加延迟双删，用消息队列实现异步重试。<br><br>
    <strong>数据变更来源多、需要业务代码解耦</strong>：引入 Canal + MQ，接受毫秒级最终一致延迟。<br><br>
    <strong>强一致（金融、库存扣减）</strong>：不要依赖缓存一致性，改为先查 DB（缓存仅用于幂等性判断或限流），或引入分布式事务（成本极高，慎用）。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('四种方案对比速查', overviewTable)}
    ${section('Cache-Aside（旁路缓存）', cacheAsideBox + cacheAsidePair)}
    ${section('延迟双删', delayDoubleDeleteBox + delayDoubleDeletePair)}
    ${section('常见误区', pitfall1 + pitfall2 + pitfall3)}
    ${section('方案选型指南', selectionBox)}`);
}
// ${section('Canal 监听 Binlog', canalBox + canalPair)}
// ${section('常见误区', pitfall1 + pitfall2 + pitfall3)}
