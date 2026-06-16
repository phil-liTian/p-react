function renderSpringTransactionPitfalls(t) {
  const conclusion = ruleBox('warning',
    `<strong>@Transactional 失效的根本原因只有三类：</strong><br><br>
    <strong>① Spring AOP 代理没有介入</strong>——事务是通过动态代理实现的，凡是绕过代理直接调用方法的情况，注解形同虚设。<br>
    <strong>② Spring 没有感知到异常</strong>——异常被吞掉，或异常类型不在回滚范围内，Spring 认为方法正常结束，不触发回滚。<br>
    <strong>③ 传播行为理解错误</strong>——默认 REQUIRED 会共享事务，内层异常把整个事务标记为 rollback-only，外层 catch 后仍无法提交。<br><br>
    以下五个场景是生产中最高频的踩坑点。`);

  // ── 场景一：同类内部自调用 ────────────────────────────────────────────────────

  const selfInvokeBox = ruleBox('danger',
    `<strong>场景一：同类内部调用（Self-Invocation）——最高频陷阱</strong><br><br>
    的事务是通过 <strong>AOP 代理</strong>实现的：外部调用 Bean 时，实际调用的是代理对象，代理在调用真实方法前后织入事务逻辑。<br>
    但 <strong>同一个类内部调用</strong> 用的是 <code>this</code>，直接访问真实对象，完全绕过代理——事务注解不生效。`);

  const selfInvokeBad = `@Service
public class OrderService {

  public void createOrder(Order order) {
    // ❌ 用 this 调用，绕过了 Spring 代理
    // 下面方法上的 @Transactional 完全不生效
    this.saveAndNotify(order);
  }

  @Transactional
  public void saveAndNotify(Order order) {
    orderMapper.insert(order);
    notificationMapper.insert(buildNotification(order));
    // 如果 notificationMapper.insert 抛出异常，
    // orderMapper.insert 不会回滚！
  }
}`;

  const selfInvokeGood = `// ✅ 修复方案一：把被调方法移到另一个 Bean
@Service
public class OrderService {

  @Autowired
  private OrderSaveService orderSaveService; // 注入另一个 Bean

  public void createOrder(Order order) {
    orderSaveService.saveAndNotify(order); // 走代理，事务生效
  }
}

@Service
public class OrderSaveService {

  @Transactional
  public void saveAndNotify(Order order) {
    orderMapper.insert(order);
    notifitionMapper.insert(buildNotification(order));
  }
}

// ✅ 修复方案二：通过 AopContext 获取当前代理（不推荐，侵入性强）
// 需要在启动类加 @EnableAspectJAutoProxy(exposeProxy = true)
public void createOrder(Order order) {
  ((OrderService) AopContext.currentProxy()).saveAndNotify(order);
}`;

  const selfInvokePair = codeBlocksRow([
    codeBlock('❌ 内部 this 调用——事务不生效', 'dot-red', 'java', selfInvokeBad),
    codeBlock('✅ 注入另一个 Bean 调用', 'dot-green', 'java', selfInvokeGood),
  ]);

  // ── 场景二：方法非 public ─────────────────────────────────────────────────────

  const nonPublicBox = ruleBox('danger',
    `<strong>场景二：方法访问修饰符非 public</strong><br><br>
    Spring AOP 默认只拦截 <code>public</code> 方法。<code>private</code>、<code>protected</code>、包级别方法上的 <code>@Transactional</code> 会被<strong>静默忽略</strong>——不报错，但事务不生效，非常隐蔽。`);

  const nonPublicBad = `@Service
public class UserService {

  // ❌ private 方法——@Transactional 被静默忽略
  @Transactional
  private void updateUserAndLog(User user) {
    userMapper.update(user);
    auditMapper.insert(buildLog(user));
    // 异常时 userMapper.update 不会回滚
  }

  // ❌ protected 方法——同样不生效
  @Transactional
  protected void resetPassword(Long userId) {
    userMapper.resetPassword(userId);
  }
}`;

  const nonPublicGood = `@Service
public class UserService {

  // ✅ 改为 public——事务正常生效
  @Transactional
  public void updateUserAndLog(User user) {
    userMapper.update(user);
    auditMapper.insert(buildLog(user));
    // 异常时两步都回滚
  }

  // ✅ 如果逻辑必须私有，把事务提到 public 入口层
  public void resetPassword(Long userId) {
    doResetPassword(userId); // 调内部私有方法
  }

  @Transactional // 放在 public 方法上
  public void doResetPassword(Long userId) { // 改为 public
    userMapper.resetPassword(userId);
  }
}`;

  const nonPublicPair = codeBlocksRow([
    codeBlock('❌ private/protected——事务静默失效', 'dot-red', 'java', nonPublicBad),
    codeBlock('✅ 改为 public', 'dot-green', 'java', nonPublicGood),
  ]);

  // ── 场景三：异常被 catch 吞掉 ────────────────────────────────────────────────

  const catchBox = ruleBox('danger',
    `<strong>场景三：异常被 catch 后未重新抛出</strong><br><br>
    Spring 通过捕获方法抛出的异常来触发回滚。如果你在方法内 <code>catch</code> 了异常却没有重新 <code>throw</code>，
    Spring 认为方法<strong>正常结束</strong>，会提交事务，而不是回滚。<br><br>
    前端类比：<code>Promise</code> 链里 <code>.catch(e => {})</code> 吞掉了错误，外层的 <code>.catch</code> 永远触发不了。`);

  const catchBad = `@Service
public class PaymentService {

  @Transactional
  public void processPayment(Long orderId) {
    orderMapper.markPaying(orderId);     // 第一步：标记支付中

    try {
      paymentGateway.charge(orderId);   // 第二步：调支付网关
    } catch (PaymentException e) {
      log.error("支付失败", e);
      // ❌ 吞掉了异常，没有 throw
      // Spring 不知道出错了，会提交事务
      // 结果：order 状态变成"支付中"，但实际没有扣款 → 数据不一致
    }
  }
}`;

  const catchGood = `@Service
public class PaymentService {

  @Transactional
  public void processPayment(Long orderId) {
    orderMapper.markPaying(orderId);

    try {
      paymentGateway.charge(orderId);
    } catch (PaymentException e) {
      log.error("支付失败", e);
      throw new RuntimeException("支付失败，已回滚", e); // ✅ 重新抛出
      // 或者：手动标记回滚（不推荐，会让事务进入只读状态）
      // TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
  }

  // ✅ 更简洁：不 catch，让异常自然传播
  @Transactional
  public void processPaymentSimple(Long orderId) {
    orderMapper.markPaying(orderId);
    paymentGateway.charge(orderId); // 直接抛，Spring 自动回滚
  }
}`;

  const catchPair = codeBlocksRow([
    codeBlock('❌ catch 吞掉异常——事务提交不回滚', 'dot-red', 'java', catchBad),
    codeBlock('✅ 重新抛出 / 不 catch', 'dot-green', 'java', catchGood),
  ]);

  // ── 场景四：异常类型不匹配（rollbackFor）────────────────────────────────────

  const rollbackForBox = ruleBox('danger',
    `<strong>场景四：抛出了受检异常（Checked Exception），但未配置 rollbackFor</strong><br><br>
    Spring 默认只回滚 <code>RuntimeException</code>（非受检异常）和 <code>Error</code>。<br>
    如果你的方法抛出的是受检异常（如 <code>IOException</code>、<code>SQLException</code>、自定义的 <code>BusinessException extends Exception</code>），
    <strong>事务不会回滚</strong>——除非显式配置 <code>rollbackFor</code>。`);

  const rollbackForBad = `// 自定义受检异常
public class BusinessException extends Exception { // ← 继承 Exception，是受检异常
  public BusinessException(String msg) { super(msg); }
}

@Service
public class TransferService {

  // ❌ BusinessException 是受检异常，默认不回滚
  @Transactional
  public void transfer(Long from, Long to, BigDecimal amount)
      throws BusinessException {
    accountMapper.deduct(from, amount);   // 第一步

    if (amount.compareTo(BigDecimal.ZERO) <= 0) {
      throw new BusinessException("金额必须大于0");
      // ❌ 事务不回滚！deduct 的扣款已提交
    }

    accountMapper.add(to, amount);
  }
}`;

  const rollbackForGood = `// ✅ 方案一：加 rollbackFor，最推荐
@Transactional(rollbackFor = Exception.class) // 所有异常都回滚
public void transfer(Long from, Long to, BigDecimal amount)
    throws BusinessException {
  accountMapper.deduct(from, amount);
  if (amount.compareTo(BigDecimal.ZERO) <= 0) {
    throw new BusinessException("金额必须大于0"); // 现在会回滚
  }
  accountMapper.add(to, amount);
}

// ✅ 方案二：把自定义异常改为继承 RuntimeException
public class BusinessException extends RuntimeException { // 非受检异常
  public BusinessException(String msg) { super(msg); }
}

// 继承 RuntimeException 后，默认就会回滚，无需配置 rollbackFor
@Transactional
public void transfer(Long from, Long to, BigDecimal amount) {
  accountMapper.deduct(from, amount);
  if (amount.compareTo(BigDecimal.ZERO) <= 0) {
    throw new BusinessException("金额必须大于0"); // 自动回滚
  }
  accountMapper.add(to, amount);
}`;

  const rollbackForPair = codeBlocksRow([
    codeBlock('❌ 受检异常——默认不回滚', 'dot-red', 'java', rollbackForBad),
    codeBlock('✅ rollbackFor / 改继承 RuntimeException', 'dot-green', 'java', rollbackForGood),
  ]);

  // ── 场景五：REQUIRED 传播级别下的 rollback-only 陷阱 ─────────────────────────

  const propagationBox = ruleBox('danger',
    `<strong>场景五：内层 @Transactional 抛了异常，被外层 catch 住，外层提交时抛 UnexpectedRollbackException</strong><br><br>
    <code>REQUIRED</code>（默认传播行为）的含义：<strong>有事务就加入，没事务就新建</strong>。<br>
    当外层方法 A 已有事务，内层方法 B（也是 REQUIRED）被调用时，B <strong>加入了 A 的同一个事务</strong>。<br>
    一旦 B 抛出异常，Spring 立即把这个共享事务标记为 <code>rollback-only</code>。<br>
    哪怕 A 把异常 catch 住、认为"已经处理好了"，后续提交时 Spring 仍会抛出
    <code>UnexpectedRollbackException: Transaction silently rolled back</code>。`);

  const propagationBad = `@Service
public class OrderService {

  @Transactional  // 外层事务（REQUIRED，默认）
  public void createOrderWithLog(Order order) {
    orderMapper.insert(order);      // 第一步：写订单

    try {
      auditService.log(order);      // 第二步：写审计日志
    } catch (Exception e) {
      // ❌ 以为 catch 住了就没事了
      log.warn("审计日志写入失败，忽略", e);
      // 实际上：auditService.log 抛出异常时，Spring 已把
      // 整个事务（含 orderMapper.insert）标记为 rollback-only
    }

    // 方法正常返回，Spring 尝试提交事务 →
    // 💥 UnexpectedRollbackException:
    //    Transaction silently rolled back because it has been
    //    marked as rollback-only
    // 订单也没写进去！
  }
}

@Service
public class AuditService {

  @Transactional  // 也是 REQUIRED（默认）——加入外层的同一个事务
  public void log(Order order) {
    auditMapper.insert(buildLog(order));
    throw new RuntimeException("审计服务异常"); // 标记整个事务为 rollback-only
  }
}`;

  const propagationGood = `// ✅ 修复方案一：内层用 REQUIRES_NEW——开启独立事务，互不影响
@Service
public class AuditService {

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  // 不管外层有没有事务，总是新建一个独立事务
  // 内层事务回滚，外层事务不受影响
  public void log(Order order) {
    auditMapper.insert(buildLog(order));
  }
}

// ✅ 修复方案二：内层用 NESTED——创建保存点，内层回滚只回滚到保存点
@Service
public class AuditService {

  @Transactional(propagation = Propagation.NESTED)
  // 内层异常只回滚自己的部分，外层事务可以继续提交
  // 注意：NESTED 依赖数据库 savepoint，不是所有数据库都支持
  public void log(Order order) {
    auditMapper.insert(buildLog(order));
  }
}

// ✅ 修复方案三：内层用 NOT_SUPPORTED——不在事务中执行（日志类操作常用）
@Service
public class AuditService {

  @Transactional(propagation = Propagation.NOT_SUPPORTED)
  // 挂起外层事务，以非事务方式执行，执行完恢复外层事务
  // 审计日志失败不影响主流程
  public void log(Order order) {
    auditMapper.insert(buildLog(order));
  }
}`;

  const propagationNote = ruleBox('info',
    `<strong>三种修复方案的选择：</strong><br><br>
    • <code>REQUIRES_NEW</code>：内层完全独立，适合"日志/审计等辅助操作，失败不影响主流程"<br>
    • <code>NESTED</code>：内层是外层的子事务（有保存点），内层失败可被外层捕获并继续，适合"部分失败可接受"的批量操作<br>
    • <code>NOT_SUPPORTED</code>：不参与事务，适合只读的辅助查询或日志写入<br><br>
    判断依据：<strong>内层失败时，外层数据是否应该跟着回滚？</strong><br>
    是 → 用默认 REQUIRED（共享事务）&nbsp;&nbsp;否 → 用 REQUIRES_NEW 或 NOT_SUPPORTED`);

  const propagationRows = [
    ['REQUIRED（默认）',  '加入现有事务，没有则新建',   '共享事务，内层异常会标记整个事务 rollback-only'],
    ['REQUIRES_NEW',     '总是新建独立事务，挂起外层',  '内外事务完全隔离，互不影响'],
    ['NESTED',           '在当前事务内创建保存点',      '内层回滚到保存点，外层可继续；无事务则等同 REQUIRED'],
    ['NOT_SUPPORTED',    '挂起当前事务，以非事务执行',  '不参与事务，适合日志等可失败操作'],
    ['SUPPORTS',         '有事务则加入，无事务也执行',  '用于可选事务场景（只读查询等）'],
    ['NEVER',            '必须在无事务环境下执行',      '有事务则抛异常，强制要求非事务调用'],
  ];

  const propagationHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1.2fr 1.6fr 2fr">
      <div class="compare-card-header-cell frontend">传播行为</div>
      <div class="compare-card-header-cell java">含义</div>
      <div class="compare-card-header-cell desc">适用场景 / 注意事项</div>
    </div>`;

  const propagationRowsHtml = propagationRows.map(([prop, meaning, note]) => `
    <div class="compare-card-row" style="grid-template-columns: 1.2fr 1.6fr 2fr">
      <div class="compare-card-cell frontend">${escHtml(prop)}</div>
      <div class="compare-card-cell java">${escHtml(meaning)}</div>
      <div class="compare-card-cell desc">${escHtml(note)}</div>
    </div>`).join('');

  const propagationTable = `<div class="compare-card">${propagationHeaderHtml}${propagationRowsHtml}</div>`;

  const propagationPair = codeBlocksRow([
    codeBlock('❌ REQUIRED 共享事务——rollback-only 陷阱', 'dot-red', 'java', propagationBad),
    codeBlock('✅ REQUIRES_NEW / NESTED / NOT_SUPPORTED', 'dot-green', 'java', propagationGood),
  ]);

  // ── 速查总结表 ────────────────────────────────────────────────────────────────

  const summaryRows = [
    ['内部自调用（this.method()）',      'AOP 代理被绕过',              '拆分到独立 Bean'],
    ['方法非 public',                    '代理不拦截非 public 方法',     '改为 public'],
    ['异常被 catch 吞掉',                'Spring 感知不到异常',          '重新 throw / 不 catch'],
    ['受检异常未配 rollbackFor',         '默认只回滚 RuntimeException',  'rollbackFor = Exception.class 或改继承 RuntimeException'],
    ['REQUIRED 内层异常被外层 catch',    '共享事务被标记 rollback-only', '内层改用 REQUIRES_NEW / NESTED / NOT_SUPPORTED'],
  ];

  const summaryHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1.4fr 1.6fr 1.8fr">
      <div class="compare-card-header-cell frontend">失效场景</div>
      <div class="compare-card-header-cell java">根本原因</div>
      <div class="compare-card-header-cell desc">修复方案</div>
    </div>`;

  const summaryRowsHtml = summaryRows.map(([scene, reason, fix]) => `
    <div class="compare-card-row" style="grid-template-columns: 1.4fr 1.6fr 1.8fr">
      <div class="compare-card-cell frontend">${escHtml(scene)}</div>
      <div class="compare-card-cell java">${escHtml(reason)}</div>
      <div class="compare-card-cell desc">${escHtml(fix)}</div>
    </div>`).join('');

  const summaryTable = `<div class="compare-card">${summaryHeaderHtml}${summaryRowsHtml}</div>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('场景一：同类内部自调用', selfInvokeBox + selfInvokePair)}
    ${section('场景二：方法非 public', nonPublicBox + nonPublicPair)}
    ${section('场景三：异常被 catch 吞掉', catchBox + catchPair)}
    ${section('场景四：受检异常未配 rollbackFor', rollbackForBox + rollbackForPair)}
    ${section('场景五：REQUIRED 传播级别——rollback-only 陷阱', propagationBox + propagationPair + propagationNote + propagationTable)}
    ${section('五大场景速查总结', summaryTable)}`);
}
