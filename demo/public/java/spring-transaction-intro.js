function renderSpringTransactionIntro(t) {
  const conclusion = ruleBox('info',
    `<strong>事务 = 一组操作的"要么全成功，要么全回滚"保证。</strong><br><br>
    前端类比：你写过 <code>Promise.all</code> 失败后手动 undo 多个状态吗？事务就是数据库帮你做了这件事——任何一步失败，之前所有改动自动撤销，不需要你手写 rollback 逻辑。`);

  const jsRollback = `// 前端：手动管理"回滚"
async function transfer(from, to, amount) {
  try {
    await deductBalance(from, amount)   // 第一步
    await addBalance(to, amount)        // 第二步：如果这里失败...
  } catch (e) {
    await addBalance(from, amount)      // 必须手动撤销第一步
    throw e
  }
}`;

  const javaRollback = `// Spring：@Transactional 自动回滚
@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // 第一步
    userMapper.addBalance(toId, amount);       // 第二步：失败则两步都撤销
    // 不需要写任何 catch + undo 逻辑
}`;

  const rollbackPair = codeBlocksRow([
    codeBlock('JavaScript（前端手动回滚）', 'dot-blue', 'javascript', jsRollback),
    codeBlock('Java（Spring 自动回滚）', 'dot-orange', 'java', javaRollback),
  ]);

  const noTxCode = `// 没有 @Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // ✅ 扣款成功，已写入 DB

    if (true) throw new RuntimeException("网络超时"); // 模拟异常

    userMapper.addBalance(toId, amount);       // ❌ 永远不会执行
    // 结果：fromId 钱少了，toId 没收到，数据永久不一致
}`;

  const withTxCode = `@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // 扣款（在事务内，未提交）

    if (true) throw new RuntimeException("网络超时"); // 触发异常

    userMapper.addBalance(toId, amount);       // 不会执行
    // Spring 捕获到 RuntimeException → 自动 ROLLBACK
    // 结果：fromId 的钱回来了，数据保持一致
}`;

  const txComparePair = codeBlocksRow([
    codeBlock('无事务（数据不一致）', 'dot-red', 'java', noTxCode),
    codeBlock('有事务（自动回滚）', 'dot-green', 'java', withTxCode),
  ]);

  const acidRows = [
    ['Atomicity 原子性',   '要么全做，要么全撤',               'Promise.all 失败时没有中间状态'],
    ['Consistency 一致性', '事务前后数据满足约束',             '表单提交后字段不违反 unique / not null'],
    ['Isolation 隔离性',   '并发事务互不干扰',                 '两用户同时操作，看不到彼此未提交的数据'],
    ['Durability 持久性',  '提交后不会丢失',                   'localStorage.setItem 后刷新页面数据还在'],
  ];
  const acidTable = compareCard(acidRows, ['ACID 特性', '说明']);

  const annotationCode = `@Transactional(
    rollbackFor = Exception.class,  // 默认只回滚 RuntimeException，加这行让所有异常都回滚
    readOnly = true,                // 只读事务：SELECT 专用，数据库可做性能优化
    timeout = 30                    // 超时秒数，超时自动回滚（类似 fetch 的 AbortController）
)
public UserDTO getUserById(Long id) { ... }`;

  const annotationWarn = ruleBox('warning',
    `<strong>注意：<code>@Transactional</code> 只在 Spring Bean 的 public 方法上生效。</strong>
    如果你在同一个类内部直接调用带 <code>@Transactional</code> 的方法（自调用），事务不会生效——这是最常见的陷阱，后续专题会详细讲。`);

  // ── 事务传播行为 ──────────────────────────────────────────────────────────────

  const propagationBox = ruleBox('info',
    `<strong>传播行为（Propagation）：当一个带事务的方法调用另一个带事务的方法时，该用谁的事务？</strong><br><br>
    最常用的两种：<br>
    • <code>REQUIRED</code>（默认）——有事务就加入，没有就新建。两个方法共享同一个事务，任意一处回滚则整体回滚。<br>
    • <code>REQUIRES_NEW</code>——总是新建独立事务，与外层事务完全隔离。内层回滚不影响外层，外层回滚也不影响内层。`);

  const propagationRequired = `// REQUIRED（默认）：内外共享同一个事务

@Service
public class OrderService {

  @Transactional  // 外层事务 TX-1
  public void createOrder(Order order) {
    orderMapper.insert(order);       // 在 TX-1 中执行

    auditService.log(order);         // auditService.log 也是 REQUIRED
                                     // → 加入已有的 TX-1，不开新事务
    // 如果 auditService.log 抛出异常：
    // TX-1 被标记为 rollback-only
    // orderMapper.insert 也一起回滚
  }
}

@Service
public class AuditService {

  @Transactional  // REQUIRED（默认）——加入外层 TX-1
  public void log(Order order) {
    auditMapper.insert(buildLog(order));
    // 异常会传播给外层，整个 TX-1 回滚
  }
}`;

  const propagationRequiresNew = `// REQUIRES_NEW：内层开启独立事务，与外层完全隔离

@Service
public class OrderService {

  @Transactional  // 外层事务 TX-1
  public void createOrder(Order order) {
    orderMapper.insert(order);       // 在 TX-1 中执行

    try {
      auditService.log(order);       // 内层开启独立 TX-2
    } catch (Exception e) {
      log.warn("审计日志失败，不影响下单", e);
      // TX-2 已独立回滚，TX-1 不受影响
    }
    // TX-1 正常提交，订单写入成功
  }
}

@Service
public class AuditService {

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  // 挂起外层 TX-1，新建 TX-2
  // TX-2 提交/回滚完全独立于 TX-1
  public void log(Order order) {
    auditMapper.insert(buildLog(order));
    // 这里抛异常：TX-2 回滚，TX-1 继续
  }
}`;

  const propagationPair = codeBlocksRow([
    codeBlock('REQUIRED（默认）——共享事务', 'dot-orange', 'java', propagationRequired),
    codeBlock('REQUIRES_NEW——独立事务', 'dot-green', 'java', propagationRequiresNew),
  ]);

  const propagationNote = ruleBox('warning',
    `<strong>REQUIRED 最常见的陷阱：</strong><br><br>
    内层方法抛出异常时，Spring 立即将共享事务标记为 <code>rollback-only</code>。即使外层 <code>catch</code> 住了异常，后续提交时仍会抛出
    <code>UnexpectedRollbackException</code>——订单和日志都写不进去。<br><br>
    <strong>判断依据：内层失败时，外层数据该不该一起回滚？</strong><br>
    是 → 用 <code>REQUIRED</code>（共享事务，联动回滚）<br>
    否 → 用 <code>REQUIRES_NEW</code>（独立事务，互不影响）`);

  const propagationRows = [
    ['REQUIRED（默认）',  '加入现有事务；没有则新建',    '内层异常 → 整个共享事务 rollback-only'],
    ['REQUIRES_NEW',     '总是新建独立事务，挂起外层',   '内外完全隔离，互不影响'],
    ['NESTED',           '在当前事务内创建保存点',       '内层回滚到保存点，外层可继续；需数据库支持 savepoint'],
    ['NOT_SUPPORTED',    '挂起当前事务，以非事务执行',   '不参与事务，适合日志等可失败的辅助操作'],
  ];

  const propagationHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1.1fr 1.6fr 2fr">
      <div class="compare-card-header-cell frontend">传播行为</div>
      <div class="compare-card-header-cell java">含义</div>
      <div class="compare-card-header-cell desc">注意事项</div>
    </div>`;

  const propagationRowsHtml = propagationRows.map(([prop, meaning, note]) => `
    <div class="compare-card-row" style="grid-template-columns: 1.1fr 1.6fr 2fr">
      <div class="compare-card-cell frontend">${escHtml(prop)}</div>
      <div class="compare-card-cell java">${escHtml(meaning)}</div>
      <div class="compare-card-cell desc">${escHtml(note)}</div>
    </div>`).join('');

  const propagationTable = `<div class="compare-card">${propagationHeaderHtml}${propagationRowsHtml}</div>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('前端 vs Spring：谁来负责回滚？', rollbackPair)}
    ${section('中间步骤失败了，数据会怎样？', txComparePair)}
    ${section('ACID 是什么意思？', acidTable)}
    ${section('常用注解参数', codeBlock('@Transactional 参数', 'dot-orange', 'java', annotationCode) + annotationWarn)}
    ${section('事务传播行为：REQUIRED vs REQUIRES_NEW', propagationBox + propagationPair + propagationNote + propagationTable)}`);
}
