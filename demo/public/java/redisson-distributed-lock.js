function renderRedissonDistributedLock(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>Redisson 分布式锁核心结论：</strong><br><br>
    Redis 原生 <code>SETNX</code> 实现的分布式锁有两个致命问题：<strong>① 业务未执行完锁就过期</strong>（锁续期问题）、<strong>② 加锁与设置过期时间非原子</strong>（宕机死锁）。<br><br>
    Redisson 通过 <strong>Lua 脚本保证原子性</strong> + <strong>看门狗（Watchdog）自动续期</strong> 解决这两个问题，是生产环境分布式锁的首选。`);

  // ── SETNX vs Redisson 对比 ────────────────────────────────────────────────────

  const compareRows = [
    ['原子性', 'SETNX + EXPIRE 两条命令，非原子', 'Lua 脚本一次执行，原子加锁'],
    ['锁过期', '业务超时锁提前释放，其他线程误入', '看门狗每 10s 自动续期，业务完成才释放'],
    ['可重入', '不支持，同线程再加锁会死锁', '支持，同线程多次 lock() 计数累加'],
    ['锁释放', '任何人都能 DEL，存在误删风险', 'Lua 脚本校验持有者，只有加锁线程能释放'],
    ['阻塞等待', '需自己实现自旋轮询', '内置 tryLock(waitTime) 支持超时等待'],
  ];

  const tableHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1fr 2fr 2fr">
      <div class="compare-card-header-cell desc">维度</div>
      <div class="compare-card-header-cell frontend">原生 SETNX</div>
      <div class="compare-card-header-cell java">Redisson</div>
    </div>`;

  const tableRowsHtml = compareRows.map(([dim, setnx, redisson]) => `
    <div class="compare-card-row" style="grid-template-columns: 1fr 2fr 2fr">
      <div class="compare-card-cell desc">${escHtml(dim)}</div>
      <div class="compare-card-cell frontend">${escHtml(setnx)}</div>
      <div class="compare-card-cell java">${escHtml(redisson)}</div>
    </div>`).join('');

  const compareTable = `<div class="compare-card">${tableHeaderHtml}${tableRowsHtml}</div>`;

  // ── 看门狗原理 ────────────────────────────────────────────────────────────────

  const watchdogBox = ruleBox('accent',
    `<strong>看门狗（Watchdog）原理</strong><br><br>
    调用 <code>lock()</code>（不指定 leaseTime）时，Redisson 启动一个后台定时任务：<br>
    每隔 <strong>internalLockLeaseTime / 3</strong>（默认 10 秒）检查锁是否仍由当前线程持有，若是则将 TTL 重置为 <code>internalLockLeaseTime</code>（默认 30 秒）。<br><br>
    调用 <code>unlock()</code> 后，看门狗任务取消，锁不再续期，TTL 自然到期释放。<br><br>
    <strong>关键：如果调用 <code>lock(leaseTime, unit)</code> 手动指定过期时间，看门狗不会启动。</strong>
    此时必须确保业务执行时间 &lt; leaseTime，否则锁会提前释放。`);

  // ── 基础用法 ──────────────────────────────────────────────────────────────────

  const basicLockCode = `@Service
@RequiredArgsConstructor
public class OrderService {

  private final RedissonClient redissonClient;

  public void createOrder(Long userId) {
    // 每个用户一把锁，不同用户互不阻塞
    RLock lock = redissonClient.getLock("order:lock:" + userId);

    // lock()：阻塞直到获取锁，启动看门狗自动续期（不指定 leaseTime）
    lock.lock();
    try {
      // 业务逻辑：即使执行超过 30s，看门狗会自动续期
      doCreateOrder(userId);
    } finally {
      // 必须在 finally 中释放，防止异常导致锁永不释放
      lock.unlock();
    }
  }
}`;

  const tryLockCode = `@Service
@RequiredArgsConstructor
public class FlashSaleService {

  private final RedissonClient redissonClient;

  public boolean deductStock(Long productId) {
    RLock lock = redissonClient.getLock("stock:lock:" + productId);

    // tryLock(waitTime, leaseTime, unit)
    // waitTime：等待获取锁的最长时间（超时返回 false，不再等待）
    // leaseTime：锁的持有时间（指定后看门狗不启动，需确保业务在此时间内完成）
    boolean acquired;
    try {
      acquired = lock.tryLock(3, 10, TimeUnit.SECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return false;
    }

    if (!acquired) {
      // 3 秒内未获取到锁，直接返回失败（秒杀场景下可提示"系统繁忙"）
      return false;
    }

    try {
      return doDeductStock(productId);
    } finally {
      lock.unlock();
    }
  }
}`;

  const basicPair = codeBlocksRow([
    codeBlock('lock()：阻塞加锁 + 看门狗续期', 'dot-green', 'java', basicLockCode),
    codeBlock('tryLock()：超时等待，适合秒杀', 'dot-blue', 'java', tryLockCode),
  ]);

  // ── 可重入锁原理 ──────────────────────────────────────────────────────────────

  const reentrantBox = ruleBox('info',
    `<strong>可重入锁原理 —— Redis Hash 结构</strong><br><br>
    Redisson 在 Redis 中用 <strong>Hash</strong> 存储锁信息，而非简单的 String：<br>
    <code>HSET lock:key &lt;uuid:threadId&gt; &lt;重入次数&gt;</code><br><br>
    同一线程每次 <code>lock()</code> 重入次数 +1，每次 <code>unlock()</code> -1，减为 0 时才真正释放锁。<br>
    这避免了同一线程在递归调用或方法嵌套时自己把自己锁死的问题。`);

  const reentrantCode = `// Redis 中锁的数据结构（Hash）
// 127.0.0.1:6379> HGETALL order:lock:123
// 1) "a3f2c1d0-uuid:12"   ← 客户端UUID + 线程ID，唯一标识持有者
// 2) "2"                  ← 重入次数（该线程调用了两次 lock()）

// 业务场景：方法嵌套调用，同一线程两次加同一把锁
public void methodA(Long userId) {
  RLock lock = redissonClient.getLock("order:lock:" + userId);
  lock.lock();  // 重入次数：1 → 2
  try {
    methodB(userId);  // 内部也需要同一把锁
  } finally {
    lock.unlock();  // 重入次数：2 → 1（锁未释放）
  }
}

public void methodB(Long userId) {
  RLock lock = redissonClient.getLock("order:lock:" + userId);
  lock.lock();  // 同线程可重入，重入次数：1 → 2
  try {
    // ...
  } finally {
    lock.unlock();  // 重入次数：2 → 1
  }
}
// methodA 的 unlock 执行后：重入次数 1 → 0，锁真正释放`;

  // ── Lua 脚本原子性 ────────────────────────────────────────────────────────────

  const luaCode = `-- Redisson 加锁 Lua 脚本（简化版）
-- KEYS[1] = 锁的 key，ARGV[1] = leaseTime(ms)，ARGV[2] = uuid:threadId

-- 锁不存在：创建 Hash，设置重入次数为 1，设置过期时间
if (redis.call('exists', KEYS[1]) == 0) then
  redis.call('hset', KEYS[1], ARGV[2], 1)
  redis.call('pexpire', KEYS[1], ARGV[1])
  return nil  -- 加锁成功
end

-- 锁已存在，且是当前线程持有（可重入）：重入次数 +1，刷新过期时间
if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then
  redis.call('hincrby', KEYS[1], ARGV[2], 1)
  redis.call('pexpire', KEYS[1], ARGV[1])
  return nil  -- 可重入加锁成功
end

-- 锁被其他线程持有：返回剩余 TTL，告知调用方等待多久
return redis.call('pttl', KEYS[1])

---

-- Redisson 解锁 Lua 脚本（简化版）
-- 检查是否是自己持有的锁，防止误删其他线程的锁
if (redis.call('hexists', KEYS[1], ARGV[2]) == 0) then
  return nil  -- 不是自己的锁，不操作（防止误删）
end

local counter = redis.call('hincrby', KEYS[1], ARGV[2], -1)  -- 重入次数 -1
if (counter > 0) then
  redis.call('pexpire', KEYS[1], ARGV[1])  -- 还有重入层，刷新过期时间
  return 0
else
  redis.call('del', KEYS[1])  -- 重入次数归零，真正删除锁
  return 1
end`;

  const luaCodeBlock = codeBlock('加锁 & 解锁 Lua 脚本（Redisson 核心原理）', 'dot-orange', 'lua', luaCode);

  // ── 看门狗续期代码 ────────────────────────────────────────────────────────────

  const watchdogCode = `// 看门狗续期 Lua 脚本（每 10s 执行一次）
// 检查锁是否还由当前线程持有，是则重置 TTL 为 30s
if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then
  redis.call('pexpire', KEYS[1], ARGV[1])  -- 重置 TTL
  return 1  -- 续期成功
end
return 0  -- 锁已不在，不续期（unlock() 已调用）`;

  const watchdogJavaCode = `// Redisson 源码简化版（RedissonLock.java）
// scheduleExpirationRenewal() 在 lock() 成功后调用
private void scheduleExpirationRenewal(long threadId) {
  ExpirationEntry entry = new ExpirationEntry();
  entry.addThreadId(threadId);

  // 使用 Netty 时间轮，延迟 internalLockLeaseTime/3（默认 10s）后执行
  Timeout task = commandExecutor.getConnectionManager().newTimeout(
      new TimerTask() {
        @Override
        public void run(Timeout timeout) {
          // 执行续期 Lua 脚本
          renewExpiration();
          // 续期成功后，递归调度下一次续期
        }
      },
      internalLockLeaseTime / 3, TimeUnit.MILLISECONDS
  );
  entry.setTimeout(task);
  EXPIRATION_RENEWAL_MAP.put(getLockName(), entry);
}

// unlock() 时取消看门狗
protected void cancelExpirationRenewal(Long threadId) {
  ExpirationEntry task = EXPIRATION_RENEWAL_MAP.get(getLockName());
  if (task != null) {
    task.removeThreadId(threadId);
    if (task.hasNoThreads()) {
      task.getTimeout().cancel();         // 取消定时任务
      EXPIRATION_RENEWAL_MAP.remove(getLockName());
    }
  }
}`;

  const watchdogPair = codeBlocksRow([
    codeBlock('看门狗续期 Lua 脚本', 'dot-blue', 'lua', watchdogCode),
    codeBlock('Redisson 源码：续期调度（简化）', 'dot-green', 'java', watchdogJavaCode),
  ]);

  // ── 红锁 RedLock（了解即可）──────────────────────────────────────────────────

  const redlockBox = ruleBox('warning',
    `<strong>红锁（RedLock）—— 了解即可，生产慎用</strong><br><br>
    单节点 Redis 宕机时，锁数据丢失，新主节点上可能出现两个线程同时持有同一把锁。<br>
    RedLock 的方案：向 <strong>N 个独立 Redis 实例</strong>（奇数个，通常 5 个）分别加锁，超过半数（3 个）成功才认为加锁成功。<br><br>
    <strong>争议</strong>：Martin Kleppmann 指出 RedLock 在时钟漂移场景下仍不安全，且引入了极高的运维复杂度。<br>
    生产建议：<strong>使用 Redis 主从 + 哨兵/Cluster 保障高可用，配合 Redisson 普通锁即可</strong>；只有对强一致要求极高的场景才考虑 RedLock 或改用 ZooKeeper/etcd。`);

  const redlockCode = `// Redisson RedLock 用法（仅供了解）
@Bean
public RedissonClient redissonNode1() { /* 连接第一个独立 Redis */ }
@Bean
public RedissonClient redissonNode2() { /* 连接第二个独立 Redis */ }
@Bean
public RedissonClient redissonNode3() { /* 连接第三个独立 Redis */ }

// 使用 RedissonMultiLock（3/5 节点加锁成功才算获取到锁）
RLock lock1 = redissonNode1().getLock("lock:key");
RLock lock2 = redissonNode2().getLock("lock:key");
RLock lock3 = redissonNode3().getLock("lock:key");

RLock redLock = new RedissonRedLock(lock1, lock2, lock3);
redLock.lock();
try {
  // 业务逻辑
} finally {
  redLock.unlock();
}`;

  // ── 配置与依赖 ────────────────────────────────────────────────────────────────

  const configCode = `<!-- pom.xml -->
<dependency>
  <groupId>org.redisson</groupId>
  <artifactId>redisson-spring-boot-starter</artifactId>
  <version>3.27.2</version>
</dependency>`;

  const configYamlCode = `# application.yml
spring:
  redis:
    host: 127.0.0.1
    port: 6379
    password: your_password

# redisson 配置（redisson.yml，与 application.yml 同目录）
singleServerConfig:
  address: "redis://127.0.0.1:6379"
  password: "your_password"
  connectionPoolSize: 64
  connectionMinimumIdleSize: 10
# 看门狗超时时间（默认 30000ms = 30s，可按需调整）
lockWatchdogTimeout: 30000`;

  const configPair = codeBlocksRow([
    codeBlock('pom.xml 依赖', 'dot-orange', 'xml', configCode),
    codeBlock('redisson.yml 配置', 'dot-blue', 'yaml', configYamlCode),
  ]);

  // ── 常见误区 ──────────────────────────────────────────────────────────────────

  const pitfall1 = ruleBox('danger',
    `<strong>误区一：lock() 后忘记 finally unlock()</strong><br><br>
    业务抛异常后如果没有 <code>finally { lock.unlock(); }</code>，看门狗会持续续期，锁永远不会释放（直到进程崩溃或手动删 Redis Key）。<br>
    务必将 <code>unlock()</code> 放在 <code>finally</code> 块中。`);

  const pitfall2 = ruleBox('danger',
    `<strong>误区二：指定 leaseTime 后依赖看门狗</strong><br><br>
    调用 <code>lock(10, TimeUnit.SECONDS)</code> 时，看门狗<strong>不会启动</strong>，10 秒后锁自动释放。<br>
    如果业务执行超过 10 秒，其他线程会趁机获取锁，造成并发问题。<br>
    建议：生产中优先用 <code>lock()</code>（不指定 leaseTime）让看门狗兜底；若必须指定，leaseTime 要远大于预估业务时长。`);

  const pitfall3 = ruleBox('warning',
    `<strong>误区三：在事务内使用分布式锁</strong><br><br>
    <code>@Transactional</code> 方法内调用 <code>lock.unlock()</code> 后，事务尚未提交，其他线程已能获取锁并读到旧数据（事务还未提交的数据）。<br>
    正确做法：<strong>分布式锁的范围要包住整个事务</strong>，在事务方法外层加锁，确保 unlock 时事务已提交。`);

  // ── 方案选型 ──────────────────────────────────────────────────────────────────

  const selectionBox = ruleBox('success',
    `<strong>分布式锁选型建议</strong><br><br>
    <strong>绝大多数业务（秒杀、防重复提交、分布式任务）</strong>：Redisson <code>RLock</code> + <code>lock()</code> + 看门狗，开箱即用，可重入，自动续期。<br><br>
    <strong>需要尝试获取、失败即返回（秒杀限流）</strong>：<code>tryLock(waitTime, leaseTime, unit)</code>，快速失败，避免线程堆积。<br><br>
    <strong>Redis 主从切换导致锁丢失可接受（大部分业务）</strong>：普通 Redisson 锁 + Redis 主从高可用即可。<br><br>
    <strong>金融级强一致（不能容忍锁丢失）</strong>：考虑 ZooKeeper（<code>Curator</code> InterProcessMutex）或 etcd，代价是性能下降 10 倍以上。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('原生 SETNX vs Redisson 对比', compareTable)}
    ${section('看门狗（Watchdog）原理', watchdogBox)}
    ${section('基础用法', basicPair)}
    ${section('可重入锁原理', reentrantBox + codeBlock('可重入锁：Redis Hash 结构', 'dot-blue', 'java', reentrantCode))}
    ${section('Lua 脚本原子性保障', luaCodeBlock)}
    ${section('看门狗续期实现', watchdogPair)}
    ${section('红锁 RedLock（了解）', redlockBox + codeBlock('RedLock 用法', 'dot-yellow', 'java', redlockCode))}
    ${section('依赖与配置', configPair)}
    ${section('常见误区', pitfall1 + pitfall2 + pitfall3)}
    ${section('选型建议', selectionBox)}`);
}
