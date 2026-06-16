function renderSpringTransactionIsolation(t) {
  const conclusion = ruleBox('info',
    `<strong>隔离级别 = 控制"多个事务并发时，互相能看到什么"。</strong><br><br>
    隔离性越高，数据越准确，但并发性能越低（加的锁越多）。实际生产中 <strong>99% 的场景用数据库默认级别（MySQL = REPEATABLE READ）</strong>就够了；
    只有特殊业务（报表、票务、金融对账）才需要显式指定。`);

  // ── Section 1: 三大并发问题 ────────────────────────────────────────────────────

  const problemsHtml = `
    <p><strong>理解隔离级别之前，先搞清楚它要解决什么问题。</strong>以下三种异常都发生在多个事务并发执行时：</p>`;

  const dirtyReadCode = `// 脏读（Dirty Read）：读到了别人未提交的数据
//
// 时间线：
// 事务 A                           事务 B
// ─────────────────────────────────────────────────────
// BEGIN                            BEGIN
//                                  UPDATE account SET balance = 0 WHERE id = 1
// SELECT balance FROM account      (balance 已改为 0，但未提交)
//   WHERE id = 1  → 读到 0  ← 脏读！
//
//                                  ROLLBACK  (B 回滚，balance 实际还是 100)
//
// A 读到了 0，但真实值是 100
// A 基于错误数据做了决策 → 数据损坏

// 前端类比：你 fetch 了一个接口，返回了 "balance: 0"
// 但服务器其实正在回滚这个事务，真实余额是 100`;

  const nonRepeatableReadCode = `// 不可重复读（Non-Repeatable Read）：同一行，两次读值不同
//
// 时间线：
// 事务 A                           事务 B
// ─────────────────────────────────────────────────────
// BEGIN
// SELECT balance FROM account
//   WHERE id = 1  → 读到 100
//
//                                  BEGIN
//                                  UPDATE account SET balance = 50 WHERE id = 1
//                                  COMMIT
//
// SELECT balance FROM account
//   WHERE id = 1  → 读到 50  ← 和第一次不同！
//
// A 在同一个事务里读了两次，结果不一致
// 前端类比：同一个 GET /api/account/1，刷新两次结果不同（中间被别人改了）`;

  const phantomReadCode = `// 幻读（Phantom Read）：同一个范围查询，两次行数不同
//
// 时间线：
// 事务 A                           事务 B
// ─────────────────────────────────────────────────────
// BEGIN
// SELECT COUNT(*) FROM orders
//   WHERE user_id = 1  → 返回 3 条
//
//                                  BEGIN
//                                  INSERT INTO orders (user_id, ...) VALUES (1, ...)
//                                  COMMIT
//
// SELECT COUNT(*) FROM orders
//   WHERE user_id = 1  → 返回 4 条  ← 多了一行"幻影"！
//
// 前端类比：两次 GET /api/orders?userId=1，中间有人下了新单，行数变了
// 注意：不可重复读针对"行的值变了"，幻读针对"行的数量变了"`;

  // ── Section 2: 四个隔离级别对照 ────────────────────────────────────────────────

  const levelRows = [
    ['READ UNCOMMITTED', '读未提交', '脏读 ✓  不可重复读 ✓  幻读 ✓', '几乎不用，性能最高但最不安全'],
    ['READ COMMITTED',   '读已提交', '脏读 ✗  不可重复读 ✓  幻读 ✓', 'Oracle/PostgreSQL 默认，防脏读'],
    ['REPEATABLE READ',  '可重复读', '脏读 ✗  不可重复读 ✗  幻读 △', 'MySQL InnoDB 默认，Gap Lock 大部分防幻读'],
    ['SERIALIZABLE',     '串行化',   '脏读 ✗  不可重复读 ✗  幻读 ✗', '最安全，性能最差，事务完全串行执行'],
  ];

  const levelHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1.2fr 1fr 2fr 1.8fr">
      <div class="compare-card-header-cell frontend">隔离级别</div>
      <div class="compare-card-header-cell java">中文名</div>
      <div class="compare-card-header-cell desc">防止了什么</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const levelRowsHtml = levelRows.map(([level, cn, prevents, note]) => `
    <div class="compare-card-row" style="grid-template-columns: 1.2fr 1fr 2fr 1.8fr">
      <div class="compare-card-cell frontend">${escHtml(level)}</div>
      <div class="compare-card-cell java">${escHtml(cn)}</div>
      <div class="compare-card-cell desc">${escHtml(prevents)}</div>
      <div class="compare-card-cell desc">${escHtml(note)}</div>
    </div>`).join('');

  const levelTable = `<div class="compare-card">${levelHeaderHtml}${levelRowsHtml}</div>`;

  const mysqlNote = ruleBox('warning',
    `<strong>MySQL InnoDB 默认 REPEATABLE READ，但通过 Gap Lock（间隙锁）基本解决了幻读。</strong><br>
    严格意义上 REPEATABLE READ 不防幻读，但 MySQL 的实现是个例外。如果你用 PostgreSQL，默认是 READ COMMITTED，幻读要靠 SERIALIZABLE 才能完全防止。`);

  // ── Section 3: Spring 中如何使用 ─────────────────────────────────────────────

  const springUsageCode = `// 方式一：在 @Transactional 注解上指定
@Transactional(isolation = Isolation.READ_COMMITTED)
public List<Order> getUserOrders(Long userId) {
    return orderMapper.findByUserId(userId);
}

// 方式二：默认值（跟随数据库默认，推荐）
@Transactional  // isolation = Isolation.DEFAULT，由数据库决定
public void transfer(Long from, Long to, BigDecimal amount) {
    // MySQL 环境下自动使用 REPEATABLE READ
}

// 所有可选值
// Isolation.DEFAULT          → 跟随数据库（最常用）
// Isolation.READ_UNCOMMITTED → 读未提交（几乎不用）
// Isolation.READ_COMMITTED   → 读已提交（多读少写报表类业务）
// Isolation.REPEATABLE_READ  → 可重复读（强调读一致性）
// Isolation.SERIALIZABLE     → 串行化（金融对账、库存扣减等极端场景）`;

  // ── Section 4: 典型业务场景选型 ──────────────────────────────────────────────

  const scenarioRows = [
    ['普通 CRUD（用户、文章）',     'DEFAULT（跟随数据库）',       '默认就够，不需要显式指定'],
    ['报表 / 统计查询',            'READ COMMITTED',              '允许读到别人刚提交的数据，避免长时间持锁'],
    ['票务 / 库存扣减',            'REPEATABLE READ + 行锁',      '同一事务内读到的库存数量不变，再配合 SELECT FOR UPDATE'],
    ['金融对账 / 月结',            'SERIALIZABLE',                '宁可慢，也不能出现任何并发异常'],
    ['只读事务（GET 接口）',        'READ COMMITTED + readOnly',   'readOnly=true 让数据库做读优化，不加写锁'],
  ];
  const scenarioTable = compareCard(scenarioRows, ['业务场景', '推荐隔离级别']);

  // ── Section 5: 完整示例 ───────────────────────────────────────────────────────

  const inventoryCode = `// 库存扣减：REPEATABLE_READ + SELECT FOR UPDATE
@Transactional(isolation = Isolation.REPEATABLE_READ)
public boolean deductStock(Long productId, int quantity) {
    // SELECT ... FOR UPDATE 加行锁，防止并发超卖
    Product product = productMapper.selectForUpdate(productId);

    if (product.getStock() < quantity) {
        return false; // 库存不足，事务结束自动解锁
    }

    productMapper.deductStock(productId, quantity);
    return true;
}

// Mapper XML
// <select id="selectForUpdate" resultType="Product">
//   SELECT * FROM product WHERE id = #{id} FOR UPDATE
// </select>`;

  const reportCode = `// 报表查询：READ_COMMITTED，避免持锁太久
@Transactional(
    isolation = Isolation.READ_COMMITTED,
    readOnly = true  // 只读事务：数据库可以做快照读优化
)
public ReportDTO generateMonthlyReport(YearMonth month) {
    // 大量 SELECT，不加写锁
    // 即使别的事务在提交，这里也能读到最新数据
    List<Order> orders = orderMapper.findByMonth(month);
    return buildReport(orders);
}`;

  const codePair = codeBlocksRow([
    codeBlock('库存扣减（REPEATABLE_READ）', 'dot-orange', 'java', inventoryCode),
    codeBlock('报表查询（READ_COMMITTED）', 'dot-blue', 'java', reportCode),
  ]);

  const finalTip = ruleBox('success',
    `<strong>99% 的场景：不写 isolation，用数据库默认值。</strong><br>
    只在出现以下信号时才考虑调整：<br>
    • 报表/统计接口慢 → 试试 READ_COMMITTED + readOnly<br>
    • 库存/票务出现超卖 → REPEATABLE_READ + SELECT FOR UPDATE<br>
    • 对账数据出现偏差 → SERIALIZABLE（性能代价大，确认必要再用）`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('并发事务的三大异常', problemsHtml +
      codeBlock('脏读（Dirty Read）', 'dot-red', 'java', dirtyReadCode) +
      codeBlock('不可重复读（Non-Repeatable Read）', 'dot-yellow', 'java', nonRepeatableReadCode) +
      codeBlock('幻读（Phantom Read）', 'dot-blue', 'java', phantomReadCode)
    )}
    ${section('四个隔离级别对照', levelTable + mysqlNote)}
    ${section('Spring 中如何指定隔离级别', codeBlock('@Transactional isolation 参数', 'dot-orange', 'java', springUsageCode))}
    ${section('业务场景选型速查', scenarioTable)}
    ${section('典型业务示例', codePair)}
    ${section('实用建议', finalTip)}`);
}
