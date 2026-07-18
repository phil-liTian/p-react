function renderJavaThreadPool(t) {
  const whyBox = ruleBox('warning',
    `<strong>前端是单线程，Java 默认是多线程——这是后端绕不开并发问题的根源。</strong><br><br>
    浏览器 JS 引擎同一时刻只跑一段代码，<code>await</code> 只是挂起，不是并行。<br>
    Java 服务端一个请求一条线程：1000 个用户同时点下单，就有 1000 条线程在跑。
    想要"后台同时发邮件、写日志、调外部接口"也得开线程。<br><br>
    <strong>线程的代价：</strong>创建一条线程 ≈ 1MB 栈空间 + 系统调用开销；频繁创建/销毁会让 CPU 全忙在切线程上。<br>
    <strong>线程池的作用：</strong>像数据库连接池一样预先建好一批线程，任务来了直接复用，用完归还——避免频繁创建/销毁，还能控制上限防止系统被压垮。`);

  const compareRows = [
    ['单线程 + 事件循环',          '多线程 + 锁',                   '执行模型本质区别'],
    ['async/await（挂起）',        'Thread / Runnable',             '异步 vs 并行'],
    ['Promise.all 并发',           'ExecutorService.invokeAll',     '批量并发执行'],
    ['宏任务队列',                  'BlockingQueue 阻塞队列',        '任务排队的容器'],
    ['无（单线程无竞态）',          'synchronized / Lock',           '并发安全控制'],
    ['无（无法限制）',              '线程池 + 拒绝策略',             '限流与背压'],
  ];
  const compareTable = compareCard(compareRows, ['前端类比', 'Java 方案']);

  const createBox = ruleBox('info',
    `<strong>三种创建方式，越往下越好。</strong><br>
    ① <code>extends Thread</code>：继承类，单继承局限大，不推荐。<br>
    ② <code>implements Runnable</code>：实现接口，可复用，但没有返回值。<br>
    ③ <code>implements Callable&lt;V&gt;</code> + <code>Future</code>：能返回结果、能抛异常，配合线程池最常用。`);

  const createPair = codeBlocksRow([
    codeBlock('① 继承 Thread（不推荐）', 'dot-red', 'java',
`public class MyThread extends Thread {
  @Override
  public void run() {
    System.out.println("线程：" + Thread.currentThread().getName());
  }
}

MyThread t = new MyThread();
t.start(); // 注意是 start()，不是 run()！
// run() 是普通方法调用，start() 才会真正开新线程`),
    codeBlock('② 实现 Runnable（常用）', 'dot-green', 'java',
`public class MyTask implements Runnable {
  @Override
  public void run() {
    System.out.println("线程：" + Thread.currentThread().getName());
  }
}

// 推荐用法：交给线程池执行
ExecutorService pool = Executors.newSingleThreadExecutor();
pool.submit(new MyTask());

// 也可以用 Lambda（Runnable 是函数式接口）
pool.submit(() -> System.out.println("Lambda 任务"));`),
  ]);

  const callableCode = `import java.util.concurrent.*;

public class TaskWithResult implements Callable<Integer> {
  @Override
  public Integer call() throws Exception {
    Thread.sleep(1000); // 模拟耗时
    return 42;
  }
}

ExecutorService pool = Executors.newFixedThreadPool(4);
Future<Integer> future = pool.submit(new TaskWithResult());

// 主线程可以继续做别的事...
System.out.println("任务已提交，主线程不阻塞");

// 需要结果时调用 get()，会阻塞直到任务完成
Integer result = future.get(); // ← 这里阻塞 1 秒
System.out.println("拿到结果：" + result);

// 类比前端：
// const promise = fetch('/api/data');  // 类似 Future
// const data = await promise;          // 类似 future.get()`;

  const lifecycleBox = ruleBox('info',
    `<strong>线程六种状态（Thread.State 枚举）。</strong><br>
    前端没有这些概念——因为 JS 单线程，"等待"就是回到事件循环。Java 线程是真实 OS 线程，
    状态由 OS 调度器管理，理解状态对排查"线程卡死"至关重要。`);

  const lifecycleRows = [
    ['NEW',           '已创建未 start()',                 '刚 new 出来，还没调用 start()'],
    ['RUNNABLE',      '就绪或运行中',                     '调了 start()，等 CPU 时间片或正在执行'],
    ['BLOCKED',       '等 synchronized 锁',               '想进同步块但锁被别人持有'],
    ['WAITING',       '无限期等待',                       '调用了 wait() / join() / LockSupport.park()'],
    ['TIMED_WAITING', '限时等待',                         '调用了 sleep(ms) / wait(ms) / join(ms)'],
    ['TERMINATED',    '执行完毕',                         'run() 返回，线程结束，不能再 start()'],
  ];

  const lifecycleHtml = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">状态</div>
        <div class="compare-card-header-cell java">触发条件</div>
        <div class="compare-card-header-cell desc">说明</div>
      </div>
      ${lifecycleRows.map(([s, cond, desc]) => `
        <div class="compare-card-row">
          <div class="compare-card-cell frontend"><code>${escHtml(s)}</code></div>
          <div class="compare-card-cell java">${escHtml(cond)}</div>
          <div class="compare-card-cell desc">${escHtml(desc)}</div>
        </div>`).join('')}
    </div>`;

  const poolWhyBox = ruleBox('accent',
    `<strong>为什么不用 <code>new Thread().start()</code>？四个痛点。</strong><br>
    ① <strong>开销大</strong>：每条线程创建销毁都要系统调用。<br>
    ② <strong>无控制</strong>：用户狂刷接口，瞬间开 10000 条线程，OOM 直接挂掉。<br>
    ③ <strong>无法复用</strong>：线程用完就死，下次任务还得新建。<br>
    ④ <strong>无法管理</strong>：看不到队列长度、活跃数，更别提拒绝策略。<br><br>
    <strong>线程池 = 线程复用 + 上限控制 + 任务排队 + 拒绝兜底</strong>，是企业级 Java 必备。`);

  const sevenBox = ruleBox('warning',
    `<strong>ThreadPoolExecutor 七大参数——这是面试必背，也是实战配置的核心。</strong><br>
    记忆口诀：<strong>核心 + 最大 + 存活 + 时间单位 + 阻塞队列 + 线程工厂 + 拒绝策略</strong>。`);

  const sevenCode = `public ThreadPoolExecutor(
    int corePoolSize,                      // ① 核心线程数：常驻不销毁（除非 allowCoreThreadTimeOut）
    int maximumPoolSize,                   // ② 最大线程数：队列满后才会扩容到这个数
    long keepAliveTime,                    // ③ 非核心线程空闲多久后销毁
    TimeUnit unit,                         // ④ 时间单位
    BlockingQueue<Runnable> workQueue,     // ⑤ 阻塞队列：任务排队容器
    ThreadFactory threadFactory,           // ⑥ 线程工厂：自定义线程名、是否守护等
    RejectedExecutionHandler handler       // ⑦ 拒绝策略：池满 + 队列满时的兜底
)

// 实战示例：手写一个 IO 密集型线程池
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    8,                                     // 核心 8 条（IO 密集 ≈ 2 * CPU）
    32,                                    // 最大 32 条（突发流量时扩容）
    60, TimeUnit.SECONDS,                  // 非核心空闲 60 秒回收
    new LinkedBlockingQueue<>(1000),       // 最多排 1000 个任务
    new ThreadFactoryBuilder()
        .setNameFormat("biz-pool-%d")     // 给线程起名，方便排查
        .build(),
    new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略：让调用者自己跑
);`;

  const flowBox = ruleBox('info',
    `<strong>任务提交后的执行流程（这是最常被问的考点）。</strong><br>
    很多人以为"先扩容到最大线程数，再放队列"——<strong>错！</strong>实际顺序是反的：<br>
    <strong>核心 → 队列 → 非核心 → 拒绝</strong>。`);

  const flowCode = `// execute(runnable) 的执行流程（伪代码）
public void execute(Runnable task) {
  if (当前线程数 < corePoolSize) {
    addWorker(task, true);           // ① 核心线程未满，直接开新线程跑
    return;
  }
  if (workQueue.offer(task)) {       // ② 核心满，尝试入队列（非阻塞）
    // 入队成功，等核心线程空出来取走
    return;
  }
  if (当前线程数 < maximumPoolSize) {
    addWorker(task, false);          // ③ 队列也满，扩容到非核心线程跑
    return;
  }
  handler.rejectedExecution(task, this); // ④ 池满 + 队列满，触发拒绝策略
}

// ⚠️ 这个顺序的反直觉点：
// 队列满之前不会扩容到 maximumPoolSize
// 所以如果用 LinkedBlockingQueue（无界），maximumPoolSize 永远不会触发！
// 这就是为什么阿里规范禁止 Executors.newFixedThreadPool —— 它用了无界队列`;

  const rejectBox = ruleBox('danger',
    `<strong>四种内置拒绝策略，按业务影响从轻到重排：</strong><br>
    选错策略会让任务"消失"或让接口"卡死"，必须根据业务语义选。`);

  const rejectRows = [
    ['AbortPolicy',          '抛异常 RejectedExecutionException', '默认策略，让调用方感知到失败，需 try-catch'],
    ['CallerRunsPolicy',     '让提交任务的线程自己跑',             '不丢任务，自动限流（调用方被拖慢，相当于背压）'],
    ['DiscardPolicy',        '直接丢弃新任务，不抛异常',           '静默丢任务，几乎不用（排查问题极困难）'],
    ['DiscardOldestPolicy',  '丢弃队列最老的任务，再试一次',       '适合"只关心最新数据"的场景（如行情推送）'],
  ];

  const rejectHtml = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">策略</div>
        <div class="compare-card-header-cell java">行为</div>
        <div class="compare-card-header-cell desc">适用场景</div>
      </div>
      ${rejectRows.map(([s, cond, desc]) => `
        <div class="compare-card-row">
          <div class="compare-card-cell frontend"><code>${escHtml(s)}</code></div>
          <div class="compare-card-cell java">${escHtml(cond)}</div>
          <div class="compare-card-cell desc">${escHtml(desc)}</div>
        </div>`).join('')}
    </div>`;

  const executorsBox = ruleBox('danger',
    `<strong>Executors 工具类提供四种内置池——阿里规范明令禁止使用。</strong><br>
    原因：要么用无界队列（OOM 风险），要么线程数无上限（OOM 风险）。<br>
    <strong>正确做法：手写 <code>new ThreadPoolExecutor(...)</code></strong>，参数自己控制。`);

  const executorsRows = [
    ['newFixedThreadPool',     '固定大小线程池',             'LinkedBlockingQueue 无界 → 任务堆积 OOM'],
    ['newSingleThreadExecutor', '单线程池（串行）',          '同样无界队列 → OOM'],
    ['newCachedThreadPool',    '可缓存线程池（0 核心无上限）', 'maximumPoolSize = Integer.MAX_VALUE → 创建无限线程 OOM'],
    ['newScheduledThreadPool', '定时调度池',                'DelayQueue 无界 → OOM'],
  ];

  const executorsHtml = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">工厂方法</div>
        <div class="compare-card-header-cell java">用途</div>
        <div class="compare-card-header-cell desc">风险点</div>
      </div>
      ${executorsRows.map(([s, cond, desc]) => `
        <div class="compare-card-row">
          <div class="compare-card-cell frontend"><code>${escHtml(s)}</code></div>
          <div class="compare-card-cell java">${escHtml(cond)}</div>
          <div class="compare-card-cell desc">${escHtml(desc)}</div>
        </div>`).join('')}
    </div>`;

  const sizeBox = ruleBox('accent',
    `<strong>线程数怎么定？经典公式（仅作起点，必须压测验证）。</strong><br>
    <strong>CPU 密集型</strong>（计算、加密、压缩）：<code>N + 1</code>，N = CPU 核数。<br>
    &nbsp;&nbsp;多 1 条是为了在偶发阻塞（如 GC）时 CPU 不闲着。<br>
    <strong>IO 密集型</strong>（数据库、HTTP、文件）：<code>2N 或 N × (1 + 等待时间/计算时间)</code>。<br>
    &nbsp;&nbsp;线程大部分时间在等 IO，可以多开几条，让 CPU 切来切去不闲着。<br><br>
    <strong>⚠️ 实战要点：</strong>公式只是起点。实际受下游服务（DB 连接池、对方限流）约束，必须压测调优。`);

  const sizeCode = `// 获取 CPU 核数（注意：容器里不一定准，可能拿到宿主机核数）
int cpuCores = Runtime.getRuntime().availableProcessors();

// CPU 密集型：加密、计算、序列化
ThreadPoolExecutor cpuPool = new ThreadPoolExecutor(
    cpuCores + 1,                              // 核心
    cpuCores + 1,                              // 最大（CPU 密集一般不扩容）
    0L, TimeUnit.MILLISECONDS,
    new LinkedBlockingQueue<>(1000),
    new ThreadFactoryBuilder().setNameFormat("cpu-%d").build(),
    new ThreadPoolExecutor.AbortPolicy()
);

// IO 密集型：查 DB、调外部接口、读文件
ThreadPoolExecutor ioPool = new ThreadPoolExecutor(
    2 * cpuCores,                              // 核心翻倍
    4 * cpuCores,                              // 最大可冲到 4N
    60, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(500),
    new ThreadFactoryBuilder().setNameFormat("io-%d").build(),
    new ThreadPoolExecutor.CallerRunsPolicy()  // 队列满让调用方自己跑，自动限流
);

// ⚠️ 容器环境（Docker/K8s）注意：
// availableProcessors() 可能拿到宿主机核数，导致线程开太多
// JDK 10+ 已修正，老版本需用 -XX:ActiveProcessorCount=N 显式指定`;

  const monitorBox = ruleBox('info',
    `<strong>生产环境必须监控线程池指标，否则就是黑盒。</strong><br>
    常用指标：活跃线程数、队列堆积数、已完成任务数、拒绝次数。<br>
    Spring Boot Actuator + Micrometer 可以直接暴露到 Prometheus，配 Grafana 看板。`);

  const monitorCode = `// 监控示例：定时打印线程池状态
ThreadPoolExecutor pool = ...;

ScheduledExecutorService monitor = Executors.newSingleThreadScheduledExecutor();
monitor.scheduleAtFixedRate(() -> {
  log.info("biz-pool 状态: 活跃={}, 队列={}, 已完成={}, 拒绝={}",
      pool.getActiveCount(),
      pool.getQueue().size(),
      pool.getCompletedTaskCount(),
      pool.getTaskCount() - pool.getCompletedTaskCount());
}, 0, 10, TimeUnit.SECONDS);

// Spring Boot 中暴露 Micrometer 指标
// 引入 micrometer-registry-prometheus 后：
// ExecutorServiceMetrics.monitor(meterRegistry, pool, "biz-pool");
// 自动暴露：executor_active_threads, executor_queue_size, executor_completed_tasks_total`;

  const shutdownBox = ruleBox('danger',
    `<strong>线程池用完必须关闭，否则 JVM 不退出。</strong><br>
    Spring 容器关闭时记得 <code>@PreDestroy</code> 关掉自定义线程池，否则线程泄漏。`);

  const shutdownCode = `// 两种关闭方式
pool.shutdown();      // 温和：不再接新任务，但把队列里剩下的执行完
pool.shutdownNow();   // 暴力：尝试中断正在执行的任务，返回未执行的列表

// 推荐的优雅关闭模式（Spring @PreDestroy）
@PreDestroy
public void shutdown() {
  pool.shutdown();                       // 先温和关闭
  try {
    if (!pool.awaitTermination(30, TimeUnit.SECONDS)) {
      pool.shutdownNow();                // 30 秒还没关完，强制
    }
  } catch (InterruptedException e) {
    pool.shutdownNow();
    Thread.currentThread().interrupt();  // 恢复中断标志
  }
}`;

  const decisionBox = ruleBox('accent',
    `<strong>实战决策清单。</strong><br><br>
    <strong>① 用 Executors 还是手写 ThreadPoolExecutor？</strong>→ 永远手写（阿里规范禁止 Executors）。<br>
    <strong>② 核心线程数怎么定？</strong>→ CPU 密集 N+1，IO 密集 2N，再压测调。<br>
    <strong>③ 队列选什么？</strong>→ 有界 <code>LinkedBlockingQueue(cap)</code> 或 <code>ArrayBlockingQueue</code>，<strong>坚决不用无界</strong>。<br>
    <strong>④ 拒绝策略选什么？</strong>→ 能丢就 <code>CallerRunsPolicy</code>（背压限流），不能丢就 <code>AbortPolicy</code> + 上层捕获重试。<br>
    <strong>⑤ 线程要起名！</strong>→ 用 <code>ThreadFactoryBuilder.setNameFormat</code>，否则线程崩溃日志全是 <code>pool-1-thread-3</code>，没法定位。`);

  return articleShell(t, `
    ${section('为什么 Java 需要线程？', whyBox)}
    ${section('前端 vs Java 并发对照', compareTable)}
    ${section('创建线程的三种方式', createBox + createPair + codeBlock('③ 实现 Callable（带返回值）', 'dot-blue', 'java', callableCode))}
    ${section('线程生命周期：六种状态', lifecycleBox + lifecycleHtml)}
    ${section('为什么需要线程池？', poolWhyBox)}
    ${section('ThreadPoolExecutor 七大参数', sevenBox + codeBlock('构造函数与实战配置', 'dot-orange', 'java', sevenCode))}
    ${section('任务执行流程：核心 → 队列 → 非核心 → 拒绝', flowBox + codeBlock('execute 流程伪代码', 'dot-blue', 'java', flowCode))}
    ${section('四种拒绝策略', rejectBox + rejectHtml)}
    ${section('Executors 内置池（阿里规范禁止使用）', executorsBox + executorsHtml)}
    ${section('线程数怎么定？', sizeBox + codeBlock('CPU 密集 vs IO 密集', 'dot-orange', 'java', sizeCode))}
    ${section('生产环境监控', monitorBox + codeBlock('监控指标采集', 'dot-blue', 'java', monitorCode))}
    ${section('线程池的优雅关闭', shutdownBox + codeBlock('shutdown vs shutdownNow', 'dot-orange', 'java', shutdownCode))}
    ${section('实战决策清单', decisionBox)}`);
}
