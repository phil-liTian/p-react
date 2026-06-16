function renderSpringPessimisticLock(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('warning',
    `<strong>悲观锁（SELECT ... FOR UPDATE）的核心风险只有一个：死锁。</strong><br><br>
    死锁发生的充要条件是四个经典条件同时满足。打破其中任意一个，死锁就不会发生。<br>
    在数据库事务场景中，最实用的方法是<strong>打破"循环等待"——统一加锁顺序</strong>。<br>
    当悲观锁并发冲突频繁时，应考虑切换为<strong>乐观锁（version 字段）+ 重试</strong>来提升吞吐量。`);

  // ── 死锁四大条件 ──────────────────────────────────────────────────────────────

  const deadlockCondBox = ruleBox('danger',
    `<strong>死锁四大必要条件（Coffman 条件）</strong><br><br>
    死锁的发生需要以下四个条件<strong>同时成立</strong>，打破任意一个即可消除死锁：<br><br>
    <strong>① 互斥（Mutual Exclusion）</strong>——资源同一时刻只能被一个事务/线程占用（行锁天然具备，无法打破）<br>
    <strong>② 占有并等待（Hold and Wait）</strong>——事务已持有锁 A，同时还在等待锁 B<br>
    <strong>③ 不可抢占（No Preemption）</strong>——已获取的锁不能被强制剥夺，只能主动释放（数据库层面无法改变）<br>
    <strong>④ 循环等待（Circular Wait）</strong>——事务 A 等 B 持有的锁，B 等 A 持有的锁，形成环路<br><br>
    <strong>实践结论：</strong>数据库行锁的互斥性和不可抢占性无法改变，所以防死锁的核心是<strong>打破「占有并等待」或「循环等待」</strong>。`);

  const deadlockCondRows = [
    ['① 互斥',       '行锁同时只能一个事务持有',        '无法打破——行锁的基本语义'],
    ['② 占有并等待', '持有锁A的同时等待锁B',            '一次性申请所有需要的锁（实践中难以实现）'],
    ['③ 不可抢占',   '锁不能被强制夺走',                '数据库层面无法改变'],
    ['④ 循环等待',   '多个事务形成锁等待的环路',        '★ 统一加锁顺序——最实用的解法'],
  ];

  const deadlockCondHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 0.8fr 1.6fr 2fr">
      <div class="compare-card-header-cell frontend">条件</div>
      <div class="compare-card-header-cell java">含义</div>
      <div class="compare-card-header-cell desc">打破方式</div>
    </div>`;

  const deadlockCondRowsHtml = deadlockCondRows.map(([cond, meaning, solution]) => `
    <div class="compare-card-row" style="grid-template-columns: 0.8fr 1.6fr 2fr">
      <div class="compare-card-cell frontend">${escHtml(cond)}</div>
      <div class="compare-card-cell java">${escHtml(meaning)}</div>
      <div class="compare-card-cell desc">${escHtml(solution)}</div>
    </div>`).join('');

  const deadlockCondTable = `<div class="compare-card">${deadlockCondHeaderHtml}${deadlockCondRowsHtml}</div>`;

  // ── 死锁示例：加锁顺序不一致 ─────────────────────────────────────────────────

  const lockOrderBox = ruleBox('danger',
    `<strong>死锁典型场景：两个事务反向加锁（转账）</strong><br><br>
    事务 A 从账户 1 转到账户 2，事务 B 从账户 2 转到账户 1，两个事务以<strong>相反顺序</strong>申请行锁，必然形成循环等待。`);

  const deadlockBad = `// ❌ 加锁顺序不一致 → 死锁

@Service
public class TransferService {

  @Transactional
  public void transfer(Long fromId, Long toId, BigDecimal amount) {
    // 按调用参数顺序加锁，不同调用方顺序不同
    Account from = accountMapper.selectForUpdate(fromId);
    Account to   = accountMapper.selectForUpdate(toId);
    from.deduct(amount);
    to.add(amount);
    accountMapper.update(from);
    accountMapper.update(to);
  }
}

// 并发时序：
// 线程1: transfer(1, 2)  → 先锁行1 ✓，再等行2
// 线程2: transfer(2, 1)  → 先锁行2 ✓，再等行1
// 结果：线程1 等线程2 释放行2，线程2 等线程1 释放行1
// → 循环等待 → 💥 Deadlock found when trying to get lock`;

  const deadlockGood = `// ✅ 统一按 ID 从小到大加锁，打破循环等待

@Service
public class TransferService {

  @Transactional
  public void transfer(Long fromId, Long toId, BigDecimal amount) {
    // 关键：总是先锁 ID 较小的行
    Long firstId  = Math.min(fromId, toId);
    Long secondId = Math.max(fromId, toId);

    Account first  = accountMapper.selectForUpdate(firstId);
    Account second = accountMapper.selectForUpdate(secondId);

    Account from = fromId.equals(firstId) ? first : second;
    Account to   = toId.equals(firstId)   ? first : second;

    from.deduct(amount);
    to.add(amount);
    accountMapper.update(from);
    accountMapper.update(to);
  }
}

// transfer(1,2) 和 transfer(2,1) 都先争锁行1
// → 不可能形成循环等待 → 死锁消除`;

  const deadlockPair = codeBlocksRow([
    codeBlock('❌ 加锁顺序不一致——死锁', 'dot-red', 'java', deadlockBad),
    codeBlock('✅ 统一按 ID 从小到大加锁', 'dot-green', 'java', deadlockGood),
  ]);

  // ── 加锁顺序原则速查 ──────────────────────────────────────────────────────────

  const lockRulesRows = [
    ['按主键 ID 排序',  '多行锁：Min(id) 先加，Max(id) 后加',          '转账、库存扣减等涉及同类多条记录'],
    ['按表名排序',      '跨表锁：约定固定顺序（如 order → inventory）', '订单 + 库存同时写入'],
    ['按业务层级',      '高层对象先锁，低层对象后锁（账户 → 流水）',    '账户余额 + 明细记录'],
    ['避免锁升级',      '先 FOR UPDATE 再操作，不要先读后加锁',         '防止读到旧数据后加锁发现已变更'],
    ['缩短持锁时间',    '耗时操作（RPC/HTTP）移到事务外执行',           '事务内只做 DB 操作，越短越好'],
  ];

  const lockRulesHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1fr 1.8fr 1.8fr">
      <div class="compare-card-header-cell frontend">原则</div>
      <div class="compare-card-header-cell java">做法</div>
      <div class="compare-card-header-cell desc">适用场景</div>
    </div>`;

  const lockRulesRowsHtml = lockRulesRows.map(([rule, how, scene]) => `
    <div class="compare-card-row" style="grid-template-columns: 1fr 1.8fr 1.8fr">
      <div class="compare-card-cell frontend">${escHtml(rule)}</div>
      <div class="compare-card-cell java">${escHtml(how)}</div>
      <div class="compare-card-cell desc">${escHtml(scene)}</div>
    </div>`).join('');

  const lockRulesTable = `<div class="compare-card">${lockRulesHeaderHtml}${lockRulesRowsHtml}</div>`;

  // ── 死锁排查方案 ──────────────────────────────────────────────────────────────

  const diagnoseBox = ruleBox('warning',
    `<strong>死锁排查四步法</strong><br><br>
    生产出现死锁时，数据库会自动 rollback 其中一个事务并抛出异常。排查思路如下：`);

  const diagnoseSql = `-- 步骤一：查看最近一次死锁详情（MySQL InnoDB）
SHOW ENGINE INNODB STATUS\\G
-- 关注 LATEST DETECTED DEADLOCK 部分
-- 可以看到：哪两个事务、各自持有什么锁、在等待什么锁

-- 步骤二：查看当前锁等待情况
SELECT
  r.trx_id                  AS waiting_trx_id,
  r.trx_mysql_thread_id     AS waiting_thread,
  r.trx_query               AS waiting_query,
  b.trx_id                  AS blocking_trx_id,
  b.trx_mysql_thread_id     AS blocking_thread,
  b.trx_query               AS blocking_query
FROM information_schema.innodb_lock_waits w
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_trx_id
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_trx_id;

-- 步骤三：查看哪些行被锁住
SELECT * FROM performance_schema.data_locks
WHERE LOCK_TYPE = 'RECORD'\\G

-- 步骤四：确认加锁 SQL（在业务日志中搜索 FOR UPDATE）`;

  const diagnoseCode = codeBlock('MySQL 死锁排查 SQL', 'dot-yellow', 'sql', diagnoseSql);

  const diagnoseLog = `// Spring 捕获到死锁会抛出：
// org.springframework.dao.DeadlockLoserDataAccessException:
//   ### Error updating database. Cause: com.mysql.jdbc.exceptions
//   .jdbc4.MySQLTransactionRollbackException: Deadlock found
//   when trying to get lock; try restarting transaction

// 排查清单：
// 1. 看 INNODB STATUS 确认是哪两个事务、哪些行
// 2. 反查业务代码，找出这两个事务的加锁顺序
// 3. 确认是否存在"反向加锁"模式
// 4. 修复：统一加锁顺序 或 切换乐观锁`;

  const diagnoseLogBlock = codeBlock('日志特征 & 排查清单', 'dot-orange', 'java', diagnoseLog);

  const diagnosePair = codeBlocksRow([diagnoseCode, diagnoseLogBlock]);

  // ── 乐观锁 version ────────────────────────────────────────────────────────────

  const optimisticBox = ruleBox('info',
    `<strong>乐观锁（Optimistic Locking）——高并发低冲突场景的替代方案</strong><br><br>
    悲观锁在获取锁前会阻塞其他事务，并发度低。当冲突概率不高时（读多写少），可以改用<strong>乐观锁</strong>：<br>
    <strong>不加数据库锁</strong>，每条记录加一个 <code>version</code> 字段，更新时检查版本号是否和读取时一致：<br>
    一致 → 更新成功并将 version+1；不一致 → 说明被其他事务修改过，更新失败，可以选择重试或报错。`);

  const optimisticSchema = `-- 表结构：添加 version 字段
CREATE TABLE account (
  id      BIGINT PRIMARY KEY,
  balance DECIMAL(10,2) NOT NULL,
  version INT           NOT NULL DEFAULT 0  -- 乐观锁版本号
);`;

  const optimisticCode = `// MyBatis Mapper
@Mapper
public interface AccountMapper {

  // 读取时顺带拿到 version
  @Select("SELECT * FROM account WHERE id = #{id}")
  Account selectById(@Param("id") Long id);

  // 更新时 WHERE 条件加上 version 校验
  // 只有 version 匹配才会更新，同时 version+1
  @Update("UPDATE account SET balance = #{balance}, version = version + 1 " +
          "WHERE id = #{id} AND version = #{version}")
  int updateWithVersion(Account account);
}

// Service 层
@Service
public class AccountService {

  @Transactional
  public void deduct(Long id, BigDecimal amount) {
    Account account = accountMapper.selectById(id);     // 读取，记录 version
    account.setBalance(account.getBalance().subtract(amount));

    int rows = accountMapper.updateWithVersion(account); // 更新，校验 version
    if (rows == 0) {
      // version 不匹配：说明被其他事务并发修改了
      throw new OptimisticLockException("并发冲突，请重试");
    }
  }
}`;

  const optimisticPair = codeBlocksRow([
    codeBlock('表结构：version 字段', 'dot-blue', 'sql', optimisticSchema),
    codeBlock('乐观锁更新逻辑', 'dot-green', 'java', optimisticCode),
  ]);

  // ── 并发重试 ──────────────────────────────────────────────────────────────────

  const retryBox = ruleBox('info',
    `<strong>并发重试（Retry on Conflict）</strong><br><br>
    乐观锁冲突时，更新返回 0 行，需要重新读取最新数据再尝试更新。<br>
    Spring Retry 提供了声明式重试注解，也可以手动实现重试循环。<br><br>
    <strong>注意事项：</strong><br>
    • 重试必须在<strong>事务外</strong>重试整个操作（不是在同一个事务内重新读取），否则读到的还是旧快照<br>
    • 设置最大重试次数，避免无限重试打爆数据库<br>
    • 重试间隔加入随机抖动，避免多个线程同时重试再次冲突`);

  const retrySpring = `// 方案一：Spring Retry 注解（推荐，需要 spring-retry 依赖）
// pom.xml: <dependency>spring-retry + spring-boot-starter-aop</dependency>
// 启动类: @EnableRetry

@Service
public class AccountService {

  // 遇到 OptimisticLockException 自动重试，最多 3 次，每次等 100ms
  @Retryable(
    value = OptimisticLockException.class,
    maxAttempts = 3,
    backoff = @Backoff(delay = 100, multiplier = 1.5, random = true)
  )
  @Transactional  // 每次重试都是一个新事务
  public void deduct(Long id, BigDecimal amount) {
    Account account = accountMapper.selectById(id);
    account.setBalance(account.getBalance().subtract(amount));
    int rows = accountMapper.updateWithVersion(account);
    if (rows == 0) {
      throw new OptimisticLockException("version mismatch, retrying");
    }
  }

  @Recover  // 3 次全部失败后的兜底逻辑
  public void deductRecover(OptimisticLockException e, Long id, BigDecimal amount) {
    log.error("账户 {} 扣款重试全部失败，amount={}", id, amount);
    throw new ServiceException("操作繁忙，请稍后重试");
  }
}`;

  const retryManual = `// 方案二：手动重试循环（不依赖额外库）
@Service
public class AccountService {

  private static final int MAX_RETRY = 3;

  // 注意：@Transactional 不能在这里，每次重试必须是新事务
  public void deduct(Long id, BigDecimal amount) {
    for (int attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        doDeduct(id, amount); // 每次调用都开启新事务
        return;               // 成功则直接返回
      } catch (OptimisticLockException e) {
        if (attempt == MAX_RETRY) {
          throw new ServiceException("操作繁忙，请稍后重试");
        }
        // 随机抖动，避免多线程同时重试再次冲突
        long jitter = (long)(Math.random() * 50);
        try { Thread.sleep(50 + jitter); } catch (InterruptedException ignored) {}
      }
    }
  }

  @Transactional  // 事务在内层方法，每次重试独立开启
  public void doDeduct(Long id, BigDecimal amount) {
    Account account = accountMapper.selectById(id);
    account.setBalance(account.getBalance().subtract(amount));
    int rows = accountMapper.updateWithVersion(account);
    if (rows == 0) throw new OptimisticLockException("version mismatch");
  }
}`;

  const retryPair = codeBlocksRow([
    codeBlock('Spring Retry 注解重试', 'dot-green', 'java', retrySpring),
    codeBlock('手动重试循环', 'dot-blue', 'java', retryManual),
  ]);

  // ── 悲观锁 vs 乐观锁对比 ─────────────────────────────────────────────────────

  const vsRows = [
    ['加锁方式',    'SELECT ... FOR UPDATE（数据库行锁）', 'version 字段 + CAS 更新（无数据库锁）'],
    ['并发冲突处理', '阻塞等待，持有锁直到事务结束',        '更新失败立即返回，由应用层决定重试'],
    ['适用场景',    '写多读少、冲突频率高（转账、扣库存）', '读多写少、冲突概率低（用户信息、配置）'],
    ['吞吐量',      '低（锁竞争导致串行化）',              '高（无锁，天然支持高并发读）'],
    ['主要风险',    '死锁（必须保证加锁顺序一致）',         '重试风暴（冲突频繁时大量重试打爆 DB）'],
    ['事务外操作',  '锁在事务结束时自动释放',               '重试必须在事务外，否则读到旧快照'],
  ];

  const vsHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 0.9fr 1.8fr 1.8fr">
      <div class="compare-card-header-cell desc">维度</div>
      <div class="compare-card-header-cell frontend">悲观锁（FOR UPDATE）</div>
      <div class="compare-card-header-cell java">乐观锁（version）</div>
    </div>`;

  const vsRowsHtml = vsRows.map(([dim, pessimistic, optimistic]) => `
    <div class="compare-card-row" style="grid-template-columns: 0.9fr 1.8fr 1.8fr">
      <div class="compare-card-cell desc">${escHtml(dim)}</div>
      <div class="compare-card-cell frontend">${escHtml(pessimistic)}</div>
      <div class="compare-card-cell java">${escHtml(optimistic)}</div>
    </div>`).join('');

  const vsTable = `<div class="compare-card">${vsHeaderHtml}${vsRowsHtml}</div>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('死锁四大必要条件', deadlockCondBox + deadlockCondTable)}
    ${section('典型死锁场景与加锁顺序修复', lockOrderBox + deadlockPair)}
    ${section('加锁顺序原则速查', lockRulesTable)}
    ${section('死锁排查方案', diagnoseBox + diagnosePair)}
    ${section('乐观锁（version 字段）', optimisticBox + optimisticPair)}
    ${section('并发冲突重试', retryBox + retryPair)}
    ${section('悲观锁 vs 乐观锁', vsTable)}`);
}
