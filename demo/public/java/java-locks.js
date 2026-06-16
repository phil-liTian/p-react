function renderJavaLocks(t) {
  const whyBox = ruleBox('warning',
    `<strong>前端没有锁——因为 JS 是单线程的。</strong><br><br>
    浏览器的 JS 引擎同一时刻只执行一段代码，<code>async/await</code> 只是"挂起等待"，不是真正并行。<br>
    Java 默认多线程：一个请求一条线程，多个用户同时访问同一个对象，就会出现<strong>竞态条件</strong>——
    两个线程同时读到 <code>count=5</code>，各自加 1 写回 <code>6</code>，实际上 count 只加了一次。锁就是解决这个问题的。`);

  const lockRows = [
    ['—（无锁，单线程安全）',       'synchronized 关键字',           '最简单，自动加/解锁，锁住代码块或整个方法'],
    ['—（无锁，单线程安全）',       'ReentrantLock 显式锁',          '手动 lock/unlock，支持超时、可中断、公平锁'],
    ['React state（本地副本）',     'volatile 关键字',               '不是锁！只保证可见性，不保证原子性'],
    ['并发 fetch + 串行写入',       'ReadWriteLock 读写锁',          '多线程可同时读，写时独占，读多写少首选'],
    ['乐观更新 + 冲突重试',         'CAS / Atomic* 无子类',      '不阻塞线程，用 CPU 指令做原子比较+交换'],
  ];
  const lockTable = compareCard(lockRows, ['前端类比', 'Java 方案']);

  const syncBox = ruleBox('info',
    `<strong>前端类比：给 DOM 操作套一个"禁止中断"标志位。</strong><br>
    你在前端写过 <code>isLoading = true; await fetch(...); isLoading = false</code> 来防止重复提交吗？
    <code>synchronized</code> 就是这个思路的线程安全版本——进入代码块自动上锁，退出自动解锁，其他线程只能等待。`);

  const syncBad = `// ❌ 没有锁：多线程下 count 会丢失更新
public class Counter {
  private int count = 0;

  public void increment() {
    count++; // 读-改-写 三步，线程可以在中间被打断
  }
}`;

  const syncGood = `// ✅ synchronized：同一时刻只有一个线程能进入
public class Counter {
  private int count = 0;

  public synchronized void increment() {
    count++; // 现在是原子操作
  }

  // 也可以锁代码块（粒度更细，性能更好）
  public void decrement() {
    synchronized (this) {
      count--;
    }
  }
}`;

  const syncPair = codeBlocksRow([
    codeBlock('无锁（竞态条件）', 'dot-red', 'java', syncBad),
    codeBlock('synchronized（自动互斥）', 'dot-green', 'java', syncGood),
  ]);

  const rlBox = ruleBox('info',
    `<strong>前端类比：手动管理的异步队列 + 超时 AbortController。</strong><br>
    <code>synchronized</code> 一旦等不到锁就会永久阻塞，<code>ReentrantLock</code> 可以设超时（<code>tryLock</code>）、
    响应中断、或者选择公平模式（先来先服务）。代价是必须手动 <code>unlock()</code>，忘了就是死锁。`);

  const rlCode = `import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.TimeUnit;

public class SafeCounter {
  private final ReentrantLock lock = new ReentrantLock();
  private int count = 0;

  public void increment() {
    lock.lock();           // 手动加锁
    try {
      count++;
    } finally {
      lock.unlock();       // 必须在 finally 里解锁，否则异常时永远不解锁
    }
  }

  // tryLock：类似 fetch 的 AbortController，等不到就放弃
  public boolean tryIncrement() throws InterruptedException {
    if (lock.tryLock(200, TimeUnit.MILLISECONDS)) { // 最多等 200ms
      try {
        count++;
        return true;
      } finally {
        lock.unlock();
      }
    }
    return false; // 超时，返回失败，不阻塞
  }
}`;

  const volatileBox = ruleBox('warning',
    `<strong>volatile ≠ 锁。它只解决"可见性"，不解决"原子性"。</strong><br><br>
    Java 每个线程都有自己的 CPU 缓存，线程 A 改了变量，线程 B 可能读到旧值（缓存未刷新）。<br>
    <code>volatile</code> 强制每次读写都直接操作主内存，所有线程看到同一份最新值——但 <code>count++</code> 这种
    "读-改-写"组合操作，<code>volatile</code> 仍然不安全，需要配合锁或 <code>Atomic*</code>。`);

  const volatilePair = codeBlocksRow([
    codeBlock('volatile 正确用法：状态标志位', 'dot-green', 'java',
`// ✅ 适合：只有一个线程写，其他线程读
public class Worker {
  private volatile boolean running = true; // 加 volatile

  public void stop() {
    running = false; // 主线程写
  }

  public void run() {
    while (running) {  // 工作线程读，volatile 保证能看到最新值
      doWork();
    }
  }
}`),
    codeBlock('volatile 错误用法：当锁用', 'dot-red', 'java',
`// ❌ 不适合：多线程同时写
public class Counter {
  private volatile int count = 0;

  public void increment() {
    count++; // 仍然是竞态条件！
    // count++ 等于：
    // int tmp = count;  ← 读
    // tmp = tmp + 1;    ← 改
    // count = tmp;      ← 写
    // 三步之间仍可被打断
  }
}`),
  ]);

  const rwBox = ruleBox('info',
    `<strong>前端类比：并发 fetch 读缓存，但写缓存要排队。</strong><br>
    你在前端做过"多个组件共享同一个缓存对象，读时不加锁，写时加 mutex"吗？
    <code>ReadWriteLock</code> 就是这个模式的内置实现：多个线程可以同时持有读锁，
    但写锁是独占的——写的时候，所有读都要等。适合"读多写少"场景（如配置缓存、限流统计）。`);

  const rwCode = `import java.util.concurrent.locks.ReentrantReadWriteLock;

public class ConfigCache {
  private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
  private final ReentrantReadWriteLock.ReadLock  readLock  = rwLock.readLock();
  private final ReentrantReadWriteLock.WriteLock writeLock = rwLock.writeLock();
  private Map<String, String> cache = new HashMap<>();

  // 读：多个线程可以同时进来
  public String get(String key) {
    readLock.lock();
    try {
      return cache.get(key);
    } finally {
      readLock.unlock();
    }
  }

  // 写：独占，等所有读锁释放后才能进
  public void put(String key, String value) {
    writeLock.lock();
    try {
      cache.put(key, value);
    } finally {
      writeLock.unlock();
    }
  }
}`;

  const casBox = ruleBox('info',
    `<strong>前端类比：git 的"冲突检测"或乐观更新（Optimistic Update）。</strong><br>
    CAS（Compare-And-Swap）不阻塞线程：我预期内存里是 <code>5</code>，如果确实是 <code>5</code> 就写入 <code>6</code>，
    否则重试。这是一个 CPU 原子指令，比锁开销更低。Java 的 <code>AtomicInteger</code>、<code>AtomicLong</code> 等
    都基于 CAS 实现，是高并发计数的首选。`);

  const casPair = codeBlocksRow([
    codeBlock('AtomicInteger：无锁原子计数', 'dot-green', 'java',
`import java.util.concurrent.atomic.AtomicInteger;

public class AtomicCounter {
  // 用 AtomicInteger 代替普通 int
  private final AtomicInteger count = new AtomicInteger(0);

  public void increment() {
    count.incrementAndGet(); // 原子操作，不需要 synchronized
  }

  public int get() {
    return count.get();
  }
}`),
    codeBlock('CAS 原理（底层逻辑）', 'dot-blue', 'java',
`// AtomicInteger.incrementAndGet() 底层大致等价于：
public int incrementAndGet() {
  while (true) {
    int current = get();          // 读当前值
    int next = current + 1;       // 计算新值
    if (compareAndSet(current, next)) { // CPU 原子指令：
      return next;                //   若内存值仍是 current，写入 next
    }                             //   否则说明被别人改了，重试
    // 前端类比：
    // if (cache.version === myVersion) {
    //   cache.value = newValue;  // 乐观更新成功
    // } else {
    //   retry();                 // 版本冲突，重新读取再试
    // }
  }
}`),
  ]);

  const decisionBox = ruleBox('accent',
    `<strong>选哪种方案？按顺序问自己：</strong><br><br>
    <strong>① 只有一个简单计数 / 布尔标志？</strong>→ 用 <code>Atomic*</code>（无锁，性能最好）<br>
    <strong>② 读多写少的共享数据？</strong>→ 用 <code>ReadWriteLock</code><br>
    <strong>③ 需要超时 / 可中断 / 公平性？</strong>→ 用 <code>ReentrantLock</code><br>
    <strong>④ 以上都不需要，只是简单互斥？</strong>→ 用 <code>synchronized</code>（最简洁）<br>
    <strong>⑤ 只需要"所有线程看到最新值"但不需要原子操作？</strong>→ 用 <code>volatile</code>`);

  return articleShell(t, `
    ${section('为什么 Java 需要锁？', whyBox)}
    ${section('五种方案速查对比', lockTable)}
    ${section('synchronized：最简单的互斥锁', syncBox + syncPair)}
    ${section('ReentrantLock：带超时的显式锁', rlBox + codeBlock('ReentrantLock 示例', 'dot-orange', 'java', rlCode))}
    ${section('volatile：可见性保证（不是锁）', volatileBox + volatilePair)}
    ${section('ReadWriteLock：读多写少专用', rwBox + codeBlock('ReadWriteLock 示例', 'dot-blue', 'java', rwCode))}
    ${section('CAS / Atomic*：无锁原子操作', casBox + casPair)}
    ${section('选哪种？决策速查', decisionBox)}`);
}
