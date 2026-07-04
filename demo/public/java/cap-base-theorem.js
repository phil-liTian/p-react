function renderCapBaseTheorem(t) {

  const conclusion = ruleBox('info',
    `<strong>CAP 定理：</strong>分布式系统在 <strong>一致性 (C)</strong>、<strong>可用性 (A)</strong>、<strong>分区容忍性 (P)</strong> 三者中只能同时保证两个。<br>
    由于网络分区必然存在（P 必选），实际权衡是 <strong>CP vs AP</strong>。<br><br>
    <strong>BASE 理论：</strong>对 CAP 中 C 的妥协——不追求强一致，而是<strong>基本可用 + 软状态 + 最终一致</strong>，互联网业务的主流选择。`);

  // ── CAP 三要素 ──────────────────────────────────────────────────────────────────

  const capRows = [
    ['Consistency 一致性',   '所有节点同一时刻看到相同数据',    '写完后立即读，任意节点都返回最新值'],
    ['Availability 可用性',  '每个请求都能在合理时间内得到响应', '节点宕机不阻塞用户，永远有响应'],
    ['Partition Tolerance 分区容忍', '网络分区时系统仍能运作',     '网络断开两机房，各自仍能服务'],
  ];
  const capTable = compareCard(capRows, ['要素', '定义', '体现']);

  // ── 为什么只能选两个 ────────────────────────────────────────────────────────────

  const capProofBox = ruleBox('warning',
    `<strong>反证法（为什么不能三者同时）：</strong><br><br>
    假设网络发生分区，节点 A 和节点 B 不能通信：<br>
    ① 用户向 A 写入 <code>x=1</code><br>
    ② 用户向 B 读取 <code>x</code><br><br>
    • 要 <strong>C</strong>：B 必须返回 1，但 A 的更新传不到 B → B 只能拒绝读 → 牺牲 <strong>A</strong><br>
    • 要 <strong>A</strong>：B 必须返回（哪怕是旧值 0）→ 数据不一致 → 牺牲 <strong>C</strong><br>
    • 要 <strong>P</strong>：分区时不能拒绝服务 → 必须在 A/B 间取舍<br><br>
    <strong>P 是物理必然</strong>（网络总会分区），所以实际选择是 CP 或 AP。`);

  // ── CP vs AP ────────────────────────────────────────────────────────────────────

  const choiceRows = [
    ['CP',  '强一致 + 分区容忍',  '分区时拒绝服务、等数据同步',      'ZooKeeper、etcd、HBase、金融账户'],
    ['AP',  '高可用 + 分区容忍',  '分区时各自服务、最终一致',         'Cassandra、Eureka、Dynamo、电商库存'],
    ['CA',  '强一致 + 高可用',    '放弃分区容忍 = 单机系统',          '单机 MySQL，分布式不可选'],
  ];
  const choiceTable = compareCard(choiceRows, ['选择', '保证', '代价', '典型系统']);

  const choiceNote = ruleBox('accent',
    `<strong>实际生产绝大多数互联网系统选 AP + 最终一致。</strong><br><br>
    例如电商库存：大促时多机房并发卖货，宁可超卖（事后补救）也不能让用户看到"系统繁忙"。金融账户则相反，必须 CP——宁可用户等几秒，也不能余额不一致。`);

  // ── BASE 理论 ───────────────────────────────────────────────────────────────────

  const baseRows = [
    ['BA - Basically Available',  '基本可用',     '故障时降级而非完全不可用',         '双 11 流量过大时关闭退款入口'],
    ['S - Soft State',            '软状态',       '允许存在中间状态，不要求强一致',     '订单状态"处理中"，几秒后才"成功"'],
    ['E - Eventually Consistent', '最终一致',     '经过一段时间后所有副本达到一致',     '关注/点赞数有延迟，最终会同步'],
  ];
  const baseTable = compareCard(baseRows, ['缩写', '全称', '含义', '示例']);

  // ── 一致性级别 ──────────────────────────────────────────────────────────────────

  const consistencyRows = [
    ['强一致',     '写完立即所有节点可读到最新值',          '银行转账、CP 系统'],
    ['单调一致',   '同一用户后续读不会拿到比之前更旧的值',    '用户自己发的帖子，自己永远看得到'],
    ['读己之写',   '用户写完后立即读，必看到自己写的内容',    '修改昵称后立刻刷新看到新昵称'],
    ['最终一致',   '延迟一段时间后最终同步',                '点赞数、粉丝数、推荐列表'],
  ];
  const consistencyTable = compareCard(consistencyRows, ['级别', '语义', '示例']);

  // ── 实战取舍 ────────────────────────────────────────────────────────────────────

  const scenarioRows = [
    ['账户余额',     '强一致',     'CP',  '宁可等待，不能错'],
    ['库存扣减',     '最终一致',   'AP',  '允许超卖事后回滚，抢购不能阻塞'],
    ['订单状态',     '最终一致',   'AP',  '支付回调有 1~2s 延迟可接受'],
    ['商品详情',     '最终一致',   'AP',  '缓存+MQ 同步，几秒延迟无伤大雅'],
    ['用户资料',     '读己之写',   'AP+', '自己改昵称立刻看到，他人有延迟可接受'],
    ['配置中心',     '最终一致',   'AP',  '配置变更 30s 内全集群生效'],
  ];
  const scenarioTable = compareCard(scenarioRows, ['业务', '一致性', 'CAP', '理由']);

  // ── 前端类比 ────────────────────────────────────────────────────────────────────

  const feCode = `// 前端的 CAP 影子：React 状态管理
//
// 强一致 (CP)：
// useState 永远是最新值，setState 后立即读到新值
// 代价：所有更新必须串行，无法并发
//
// 最终一致 (AP)：
// 跨标签页同步状态用 BroadcastChannel
// A 标签 setState → B 标签几毫秒后才能收到
// 代价：短时间内 A/B 标签状态不一致
//
// 类比：Redux 的 dispatch 是"强一致"
//       多端同步（firebase / yjs）是"最终一致"`;

  const feCodeBlock = codeBlock('前端类比：状态管理也有 CAP', 'dot-blue', 'javascript', feCode);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('CAP 三要素', capTable)}
    ${section('为什么只能选两个？', capProofBox)}
    ${section('CP vs AP 选型', choiceTable + choiceNote)}
    ${section('BASE 理论：互联网的现实主义', baseTable)}
    ${section('一致性级别阶梯', consistencyTable)}
    ${section('不同业务如何取舍', scenarioTable)}
    ${section('前端类比', feCodeBlock)}`);
}
