function renderIdempotency(t) {

  const conclusion = ruleBox('warning',
    `<strong>幂等 = 同一操作执行一次与执行多次，结果相同。</strong><br><br>
    数学定义：<code>f(f(x)) = f(x)</code>——多次调用不会产生副作用累积。<br>
    分布式场景下幂等是<strong>必修课</strong>，因为<strong>网络不可靠</strong>必然带来重试，重试必然带来重复执行：<br>
    • 接口超时 → 前端重试 → 后端收到两次相同请求<br>
    • MQ 消费失败 → 重投 → 消费者收到两次相同消息<br>
    • 用户连点 → 浏览器发出多次相同下单<br>
    • 主备切换/重放 → 同一事件被处理多次<br><br>
    前端类比：你写防抖（debounce）和按钮 loading + disabled，就是前端的"幂等控制"——本质都是<strong>防止重复触发带来副作用</strong>。`);

  // ── 天然幂等 vs 需要保证 ──────────────────────────────────────────────────────────

  const naturalRows = [
    ['查询接口 GET',           '天然幂等',   '读不改变状态，重复读结果一样'],
    ['删除接口 DELETE by id',  '天然幂等',   '第一次删成功，第二次返 0 行，状态一致'],
    ['更新接口 PUT (全量替换)', '天然幂等',   '<code>PUT user {name:"A"}</code> 多次结果一致'],
    ['新增接口 POST',          '需保证',     '重复提交会创建多条'],
    ['部分更新 PATCH',         '看实现',     '<code>balance += 100</code> 不幂等；<code>balance = 200</code> 幂等'],
    ['扣款 / 转账',            '需保证',     '重复执行会多扣'],
    ['消息消费',               '需保证',     '同一条消息消费两次会重复落库'],
  ];
  const naturalTable = compareCard(naturalRows, ['操作', '是否天然幂等', '原因']);

  // ── 6 种实现机制 ──────────────────────────────────────────────────────────────────

  const mechanismRows = [
    ['唯一索引',     'DB 唯一约束兜底',                  'INSERT 时唯一键冲突则跳过',         '订单号唯一、用户名唯一'],
    ['去重表',       '业务幂等表记录已处理 ID',           '处理前 INSERT 去重表，冲突则跳过',   '消息消费、回调处理'],
    ['Token 机制',   '前端先获取 token，提交时带上',       '后端校验 token 一次性使用',         '前端表单提交防重复'],
    ['状态机',       '业务状态流转约束',                  '只有当前状态才允许操作',             '订单从待支付→已支付，重复支付被拒'],
    ['乐观锁',       '版本号/时间戳控制',                 '<code>UPDATE ... WHERE version=v</code>', '并发更新库存、账户余额'],
    ['Redis setnx', '分布式锁 + 过期时间',                '<code>SETNX key value EX 10</code>', '防重复点击、限流'],
  ];
  const mechanismTable = compareCard(mechanismRows, ['机制', '原理', '实现方式', '典型场景']);

  // ── 机制详解：唯一索引 ────────────────────────────────────────────────────────────

  const uniqueIdxCode = `-- 订单表对业务订单号加唯一索引
CREATE TABLE \`order\` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(64) UNIQUE,  -- 业务订单号唯一
  user_id BIGINT,
  amount DECIMAL(10,2)
);

-- 插入时用 INSERT IGNORE 或 ON DUPLICATE KEY
INSERT IGNORE INTO \`order\`(order_no, user_id, amount)
VALUES('ORD-20260703-001', 1001, 99.00);
-- 重复插入返回 0 行受影响，业务判断为重复请求`;

  const uniqueIdxBox = ruleBox('success',
    `<strong>唯一索引是最简单可靠的幂等保障。</strong><br><br>
    适用：新增类操作，有天然业务唯一标识（订单号、流水号、外部回调单号）。<br>
    关键：<strong>业务唯一键必须在调用方生成</strong>，不能依赖 DB 自增 ID——否则每次插入都不一样，去不掉重。`);

  // ── 机制详解：Token ───────────────────────────────────────────────────────────────

  const tokenCode = `// 前端
async function submitOrder() {
  // 1. 进入页面时先申请 token
  const { token } = await fetch('/api/order/token').then(r => r.json());
  // 2. 提交时带上 token
  await fetch('/api/order', {
    method: 'POST',
    headers: { 'X-Idempotent-Token': token },
    body: JSON.stringify(payload),
  });
}

// 后端
@PostMapping("/order")
public Result createOrder(@RequestHeader("X-Idempotent-Token") String token,
                          @RequestBody OrderDTO dto) {
  // DEL token，返回 1 表示首次提交，返回 0 表示重复
  Long ok = redisTemplate.delete("order:token:" + token);
  if (ok == null || ok == 0) {
    throw new BizException("请勿重复提交");
  }
  return orderService.create(dto);
}`;

  const tokenBox = ruleBox('accent',
    `<strong>Token 机制是前端表单防重的标准方案。</strong><br><br>
    流程：前端进入页面 → 后端发一次性 token（写 Redis）→ 提交时带上 → 后端 <code>DEL</code> token，返回 1 才放行。<br>
    关键：<strong>token 必须是消费型</strong>——用完即删，不能用"判断存在"再删除，那是非原子的。<code>DEL</code> 本身是原子的，天然防并发。`);

  // ── 机制详解：状态机 ──────────────────────────────────────────────────────────────

  const stateCode = `-- 订单状态机：待支付(0) → 已支付(1) → 已发货(2) → 已完成(3)
-- 支付回调时，只有"待支付"状态能流转到"已支付"

UPDATE \`order\`
SET status = 1, pay_time = NOW()
WHERE order_no = 'ORD-001' AND status = 0;
-- 重复回调时 status 已经是 1，受影响行数为 0，业务判断为重复`;

  const stateBox = ruleBox('info',
    `<strong>状态机适合多阶段流转的业务。</strong><br><br>
    关键：<code>WHERE status = 当前预期状态</code>，让重复执行命中 0 行——天然防重。<br>
    优势：既防重又防乱序（不能从已完成跳回待支付）。`);

  // ── 机制详解：乐观锁 ──────────────────────────────────────────────────────────────

  const lockCode = `-- 扣减库存，带版本号
UPDATE product
SET stock = stock - 1, version = version + 1
WHERE id = 100 AND version = 5;
-- 如果 version 已被别的事务改过，受影响 0 行 → 并发冲突，重试或报错`;

  const lockBox = ruleBox('warning',
    `<strong>乐观锁适合"更新类"幂等与并发控制。</strong><br><br>
    关键：用版本号或时间戳做 CAS。<br>
    区别于"防重"——乐观锁主要解决<strong>并发同时改</strong>，而幂等解决<strong>重复执行</strong>。但两者机制相通：受影响 0 行即视为冲突/重复。`);

  // ── 机制详解：Redis setnx ─────────────────────────────────────────────────────────

  const setnxCode = `// 防重提交：基于"业务唯一键"做分布式锁
String key = "idempotent:" + userId + ":" + bizType + ":" + bizId;
// SETNX + 过期时间，原子操作
Boolean ok = redisTemplate.opsForValue()
    .setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
if (Boolean.FALSE.equals(ok)) {
    throw new BizException("操作正在处理，请勿重复提交");
}
// 业务执行完成后可以选择保留 key 一段时间（防重放窗口）或立即删除`;

  // ── 场景方案 ──────────────────────────────────────────────────────────────────────

  const scenarioRows = [
    ['前端表单提交防重复',       'Token + DEL',          '前端进入页面申请 token，提交时消费'],
    ['支付回调（重复回调）',     '订单号唯一索引 + 状态机', 'INSERT 唯一约束 + 状态机兜底'],
    ['MQ 消息消费',              '消息 ID 去重表',        '消费前 INSERT msg_id 到去重表，冲突跳过'],
    ['接口超时重试',             '请求 ID 唯一',          '客户端生成 requestId，服务端按它去重'],
    ['并发更新库存',             '乐观锁版本号',          'UPDATE WHERE version=v，0 行重试'],
    ['限流/防刷',                'Redis setnx + 计数',    '滑动窗口限流，本质也是幂等思想'],
    ['数据库迁移/批处理',        '业务唯一键 INSERT IGNORE', '重跑脚本不会产生重复数据'],
  ];
  const scenarioTable = compareCard(scenarioRows, ['场景', '推荐机制', '要点']);

  // ── 边界与陷阱 ────────────────────────────────────────────────────────────────────

  const pitfallBox = ruleBox('danger',
    `<strong>常见误区与陷阱：</strong><br><br>
    ① <strong>"加了唯一索引就万事大吉"</strong>——错。唯一索引只防 INSERT 重复，<strong>不防更新类副作用</strong>（如重复扣款）。<br>
    ② <strong>"先 SELECT 再 INSERT"</strong>——并发漏洞。两个请求同时 SELECT 都没找到，然后都 INSERT，唯一索引兜底会让第二个失败——但需要业务做好失败处理。<br>
    ③ <strong>"Redis setnx 用 SETEX 判断存在"</strong>——错。<code>EXISTS</code> + <code>SET</code> 是两步非原子，必须用 <code>SET NX EX</code> 一步原子。<br>
    ④ <strong>"幂等就是不让重复执行"</strong>——错。幂等允许重复执行，但<strong>结果与执行一次相同</strong>。可以返回"已处理"提示，不必报错。<br>
    ⑤ <strong>"防重窗口越长越好"</strong>——错。窗口太长会影响正常重试（用户真的想再下一次单）。需根据业务权衡。<br>
    ⑥ <strong>"MQ 投递一次只消费一次"</strong>——错。MQ 至少一次（at-least-once）是默认语义，必须做幂等。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('哪些操作天然幂等？', naturalTable)}
    ${section('6 种实现机制总览', mechanismTable)}
    ${section('机制一：唯一索引', uniqueIdxBox + codeBlock('SQL', 'success', 'sql', uniqueIdxCode))}
    ${section('机制二：Token 机制', tokenBox + codeBlock('Java + JS', 'accent', 'java', tokenCode))}
    ${section('机制三：状态机', stateBox + codeBlock('SQL', 'info', 'sql', stateCode))}
    ${section('机制四：乐观锁', lockBox + codeBlock('SQL', 'warning', 'sql', lockCode))}
    ${section('机制五：Redis setnx', codeBlock('Java', 'warning', 'java', setnxCode))}
    ${section('典型场景与方案', scenarioTable)}
    ${section('常见误区与陷阱', pitfallBox)}`);
}
