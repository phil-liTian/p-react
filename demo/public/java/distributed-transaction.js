function renderDistributedTransaction(t) {

  const conclusion = ruleBox('info',
    `<strong>分布式事务：</strong>跨越多个数据库 / 服务的事务，保证"要么全成功要么全回滚"。<br><br>
    单机事务靠数据库自身（undo/redo log）就能保证 ACID，分布式事务因为<em>每个服务有自己的连接和库</em>，必须用专门方案。主流分两类：<br>
    • <strong>强一致</strong>：2PC / 3PC / Seata AT — 性能差，适合金融<br>
    • <strong>最终一致</strong>：TCC / Saga / 本地消息表 / MQ 事务消息 — 性能好，互联网主流`);

  // ── 为什么需要 ──────────────────────────────────────────────────────────────────

  const problemCode = `// 经典场景：下单扣库存
@Service
public class OrderService {

  @Transactional  // 只能保证订单库的事务
  public void createOrder(Order order) {
    orderMapper.insert(order);              // ① 订单库
    inventoryService.deduct(order);         // ② 调用库存服务（另一个库）
    // ② 失败：① 已写入订单库，无法回滚 → 订单有了但库存没扣
    // ② 成功后网络超时：本地事务已提交，但调用方以为失败 → 重复调用
  }
}`;

  const problemBlock = codeBlock('问题：单机事务管不了跨库操作', 'dot-red', 'java', problemCode);

  // ── 方案速查 ────────────────────────────────────────────────────────────────────

  const planRows = [
    ['2PC',         '强一致', '协调者 prepare → commit/rollback',          '性能差、阻塞、协调者单点',                  '金融、数据库内部'],
    ['3PC',         '强一致', '2PC + CanCommit + 超时自动提交',             '减少阻塞，仍有一致性窗口',                  '理论意义大，实践少'],
    ['Seata AT',    '强一致', '基于 undo log 自动回滚',                     '无需业务改造、性能尚可',                    '中大型业务首选强一致方案'],
    ['TCC',         '强一致', 'Try-Confirm-Cancel 三阶段',                  '业务侵入大、需写 6 个接口',                 '高频金融（红包、优惠券）'],
    ['Saga',        '最终一致', '长事务拆多个子事务 + 补偿',                 '适合长流程、无锁',                          '旅行预订（机票+酒店+租车）'],
    ['本地消息表',  '最终一致', '本地事务 + 消息表 + 轮询/MQ 投递',           '简单、无外部依赖',                          '中小项目主流方案'],
    ['MQ 事务消息', '最终一致', 'RocketMQ 半消息',                          '依赖特定 MQ',                               '阿里系、电商订单'],
  ];
  const planTable = compareCard(planRows, ['方案', '一致性', '原理', '缺点', '适用场景']);

  // ── 2PC 原理 ────────────────────────────────────────────────────────────────────

  const twoPCBox = ruleBox('warning',
    `<strong>2PC（两阶段提交）</strong><br><br>
    <strong>阶段一 prepare：</strong>协调者问所有参与者"能否提交？"，参与者执行 SQL 但不提交，把 undo log 写好，回复 YES/NO。<br>
    <strong>阶段二 commit/rollback：</strong>只要有一个 NO，全部 rollback；全部 YES 则全部 commit。<br><br>
    <strong>致命问题：</strong><br>
    • <strong>同步阻塞</strong>：prepare 后参与者持有行锁直到 commit，期间其他事务等待<br>
    • <strong>协调者单点</strong>：协调者宕机后参与者一直阻塞<br>
    • <strong>数据不一致</strong>：commit 阶段部分参与者收不到消息`);

  // ── TCC ────────────────────────────────────────────────────────────────────────

  const tccRows = [
    ['Try',      '资源预留',     '冻结金额 100 元（不动账）',         '订单创建中'],
    ['Confirm',  '真正执行',     '扣减冻结金额 100 元',               '订单已支付'],
    ['Cancel',   '回滚预留',     '解冻 100 元',                       '订单已取消'],
  ];
  const tccTable = compareCard(tccRows, ['阶段', '语义', '示例（扣款 100）', '业务状态']);

  const tccCode = `// TCC 接口：每个业务方法要写三个对应实现
public interface AccountTcc {

  @TwoPhaseBusinessAction(name = "deductAccount", commitMethod = "confirm", rollbackMethod = "cancel")
  boolean tryDeduct(BusinessActionContext ctx, BigDecimal amount);

  // Confirm：try 成功后调用，真正扣款
  boolean confirm(BusinessActionContext ctx);

  // Cancel：try 失败或全局回滚时调用，解冻金额
  boolean cancel(BusinessActionContext ctx);
}`;

  const tccBlock = codeBlock('TCC 代码示例', 'dot-orange', 'java', tccCode);

  const tccNote = ruleBox('danger',
    `<strong>TCC 三大坑：</strong><br><br>
    ① <strong>空回滚</strong>：try 未执行就收到 cancel（网络丢包导致 try 没到）→ cancel 必须能识别"未 try"并直接返回成功<br>
    ② <strong>悬挂</strong>：cancel 比 try 先到 → cancel 后又来了 try → 这次 try 不能再执行（否则业务悬挂）<br>
    ③ <strong>幂等</strong>：confirm/cancel 都可能被重试，必须保证多次调用结果一致`);

  // ── 本地消息表 ──────────────────────────────────────────────────────────────────

  const msgCode = `// 本地消息表方案：业务 + 消息同库，保证原子性
@Service
public class OrderService {

  @Transactional
  public void createOrder(Order order) {
    orderMapper.insert(order);                   // ① 业务写入
    // ② 消息写入同一数据库的 message 表（同事务保证原子性）
    messageMapper.insert(new Message("STOCK_DEDUCT", order));
    // 事务提交后，定时任务扫描 message 表，投递到 MQ
  }
}

// 投递端：定时任务 + 幂等
@Scheduled(fixedDelay = 1000)
public void sendMessages() {
  for (Message msg : messageMapper.findPending()) {
    try {
      mqTemplate.send(msg.getTopic(), msg.getPayload());
      messageMapper.markSent(msg.getId());       // 投递成功标记
    } catch (Exception e) {
      // 失败下次重试，幂等靠消费端 dedupId
    }
  }
}`;

  const msgBlock = codeBlock('本地消息表：中小项目首选', 'dot-green', 'java', msgCode);

  const msgNote = ruleBox('success',
    `<strong>本地消息表的核心优势：</strong>简单、无外部协调者、不依赖特定 MQ。<br>
    代价：消息表会写入频繁、需要定时任务、消费端必须幂等。<br>
    适合 80% 的中小项目跨服务一致性需求。`);

  // ── Seata AT ────────────────────────────────────────────────────────────────────

  const seataBox = ruleBox('accent',
    `<strong>Seata AT 模式（业务无侵入的强一致）：</strong><br><br>
    原理：在本地事务 commit 前，Seata 自动记录 <strong>before/after undo log</strong>；任一服务失败，全局回滚时根据 undo log 反向生成补偿 SQL 自动回滚。<br><br>
    • 业务方只需加 <code>@GlobalTransactional</code> 注解，几乎无侵入<br>
    • 全局锁保证隔离性（写之前先拿全局锁）<br>
    • 性能比 XA 好，但仍有锁开销<br><br>
    适合：<strong>同一公司内部多个微服务</strong>需要强一致，业务量大但不想写 TCC 三接口的场景。`);

  // ── 选型决策 ────────────────────────────────────────────────────────────────────

  const decisionRows = [
    ['强一致 + 中等量级',   'Seata AT',         '无侵入、性能尚可'],
    ['强一致 + 高频金融',   'TCC',              '性能高但要写三接口'],
    ['最终一致 + 简单',     '本地消息表',         '中小项目首选'],
    ['最终一致 + 已有 RocketMQ', 'MQ 事务消息',  '半消息原生支持'],
    ['长流程多步骤',       'Saga',             '旅行预订、订单履约'],
  ];
  const decisionTable = compareCard(decisionRows, ['场景', '推荐', '理由']);

  // ── 幂等 ────────────────────────────────────────────────────────────────────────

  const idempotentCode = `// 消费端必须幂等：同一笔消息消费 N 次结果一致
@RocketMQMessageListener(topic = "STOCK_DEDUCT")
public class StockDeductListener implements RocketMQListener<Message> {

  @Override
  @Transactional
  public void onMessage(Message msg) {
    String dedupId = msg.getKeys();  // 业务唯一 ID（订单号）
    // 防重表：已处理过直接跳过
    if (idempotentMapper.exists(dedupId)) return;
    inventoryMapper.deduct(msg.getProductId(), msg.getQty());
    idempotentMapper.insert(dedupId);
  }
}`;

  const idempotentBlock = codeBlock('幂等：最终一致方案的生命线', 'dot-orange', 'java', idempotentCode);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('为什么单机事务救不了你', problemBlock)}
    ${section('方案速查表', planTable)}
    ${section('2PC：强一致的鼻祖', twoPCBox)}
    ${section('TCC：Try-Confirm-Cancel', tccTable + tccBlock + tccNote)}
    ${section('本地消息表：中小项目首选', msgBlock + msgNote)}
    ${section('Seata AT：业务无侵入的强一致', seataBox)}
    ${section('选型决策表', decisionTable)}
    ${section('幂等：所有方案的生命线', idempotentBlock)}`);
}
