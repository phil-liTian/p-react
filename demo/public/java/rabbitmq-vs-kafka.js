function renderRabbitmqVsKafka(t) {

  const conclusion = ruleBox('warning',
    `<strong>一句话：RabbitMQ 是"消息队列"，Kafka 是"消息日志"。</strong><br><br>
    • <strong>RabbitMQ</strong>：消息送达即从队列移除（ack 后删除），适合<strong>业务消息、任务分发、可靠投递</strong>。<br>
    • <strong>Kafka</strong>：消息是追加到分区的不可变日志，按时间/大小保留，消费者按 offset 拉取，支持<strong>回溯重放、海量吞吐、流处理</strong>。<br><br>
    前端类比：RabbitMQ 像一次性的 Event Emitter——监听器收到事件后事件就消失；Kafka 像 Git 提交历史——可以随时 <code>git checkout</code> 到任意历史位置重新跑一遍。`);

  // ── 核心对比 ──────────────────────────────────────────────────────────────────────

  const compareRows = [
    ['定位',         '消息队列（Message Queue）',        '消息日志（Commit Log / Stream）'],
    ['消息保留',     'ack 后从队列删除',                  '按时间/大小保留，消费者按 offset 读'],
    ['消费模型',     'Push 推送，broker 主动推给消费者',   'Pull 拉取，消费者按需消费'],
    ['吞吐量',       '万级 TPS（单机 ~几万）',             '百万级 TPS（顺序写盘 + 零拷贝）'],
    ['延迟',         '微秒~毫秒级',                       '毫秒级（攒批后更稳）'],
    ['顺序性',       '单队列内 FIFO',                     '单 partition 内有序，跨 partition 不保证'],
    ['路由能力',     'Exchange 路由（direct/topic/fanout）', 'topic + partition + consumer group'],
    ['消息回放',     '不支持（消息送达即删）',             '支持，按 offset 重新消费'],
    ['消息堆积',     '堆积多了性能下降（内存/磁盘压力）',   '天然支持，靠磁盘顺序写消化'],
    ['协议',         'AMQP 0.9.1 / STOMP / MQTT',         '自定义 TCP 协议'],
    ['典型体量',     '中小规模、单集群几千~几万 QPS',       '大规模、单集群百万 QPS 起'],
  ];
  const compareTable = compareCard(compareRows, ['维度', 'RabbitMQ', 'Kafka']);

  // ── 架构差异 ──────────────────────────────────────────────────────────────────────

  const archRows = [
    ['核心单元',  'Queue / Exchange / Binding',       'Topic / Partition / Replica'],
    ['分发机制',  'Exchange 按 routingKey 路由',       '按 partition key 取模分到 partition'],
    ['消费者组',  '一个队列被多个消费者共享（竞争消费）', 'consumer group 内每分区一个消费者'],
    ['高可用',    '镜像队列（多副本主从）',             'partition 多副本 + ISR + leader 选举'],
    ['持久化',    '可选（durable queue + 持久化消息）',  '默认持久化到磁盘（顺序写）'],
    ['扩容',      '纵向为主（升级机器）',               '横向分区扩容（加 partition）'],
  ];
  const archTable = compareCard(archRows, ['维度', 'RabbitMQ', 'Kafka']);

  // ── 适用场景 ──────────────────────────────────────────────────────────────────────

  const scenarioRows = [
    ['订单创建后通知库存、积分、邮件',  'RabbitMQ', '业务消息、可靠投递，需要 ack 和死信队列'],
    ['秒杀抢购异步削峰',               'RabbitMQ', '突发流量、单队列竞争消费、处理完即删'],
    ['日志收集 / 链路追踪',             'Kafka',    '海量写入、保留 7 天、多个下游消费'],
    ['用户行为埋点 / 数据仓库入仓',     'Kafka',    '高吞吐、回溯重放、对接 Flink/Spark'],
    ['事件溯源 Event Sourcing',         'Kafka',    '事件不可变、可重放重建状态'],
    ['微服务异步解耦（中小流量）',       'RabbitMQ', '路由灵活、调试简单、运维门槛低'],
    ['实时流处理（风控、推荐）',         'Kafka',    '对接 Kafka Streams / Flink 做窗口计算'],
    ['任务分发（消费者抢占处理）',       'RabbitMQ', '经典工作队列模式，消息送达即删'],
  ];
  const scenarioTable = compareCard(scenarioRows, ['场景', '推荐', '原因']);

  // ── 选型决策 ──────────────────────────────────────────────────────────────────────

  const decisionBox = ruleBox('accent',
    `<strong>选型决策树：</strong><br><br>
    1. <strong>消息送达就要删？</strong> 是 → RabbitMQ；否（要回放/保留） → Kafka<br>
    2. <strong>QPS 量级？</strong> 万级 → 两者都行；百万级 → Kafka<br>
    3. <strong>需要复杂路由？</strong> 是（topic 通配、fanout 广播） → RabbitMQ；否（按 topic 分流） → Kafka<br>
    4. <strong>需要严格顺序？</strong> 单分区 → Kafka 顺序 + 高吞吐兼得；多分区有序 RabbitMQ 单队列更简单<br>
    5. <strong>团队运维能力？</strong> 中小团队 → RabbitMQ；有专职大数据/中间件团队 → Kafka<br><br>
    <strong>不要因为"Kafka 更先进"就上 Kafka。</strong>Kafka 的运维复杂度（partition 平衡、副本同步、Consumer Group Rebalance、监控指标）远高于 RabbitMQ。`);

  // ── 相同点 ────────────────────────────────────────────────────────────────────────

  const commonBox = ruleBox('success',
    `<strong>两者作为消息中间件的共同点：</strong><br><br>
    • 都能实现<strong>异步、解耦、削峰</strong>三大基础能力<br>
    • 都支持<strong>持久化</strong>（默认或可配置）<br>
    • 都有<strong>消费者组/竞争消费</strong>机制（RabbitMQ 多消费者共享队列；Kafka consumer group）<br>
    • 都支持<strong>死信/重试</strong>（RabbitMQ DLX；Kafka 需自行实现重试 topic）<br>
    • 都需要关注<strong>幂等性</strong>——重试和重放都会导致重复消费<br>
    • 都需要关注<strong>消息顺序 vs 并行度的权衡</strong>——顺序性会牺牲并行能力`);

  // ── 常见误区 ──────────────────────────────────────────────────────────────────────

  const pitfallBox = ruleBox('danger',
    `<strong>常见误区：</strong><br><br>
    ① <strong>"Kafka 比 RabbitMQ 快所以一定选 Kafka"</strong>——错。万级 QPS 用 Kafka 是浪费运维成本。<br>
    ② <strong>"RabbitMQ 不丢消息"</strong>——半错。需 <code>durable=true</code> + 持久化消息 + <code>ack</code> 才不丢，默认开启自动 ack 会丢。<br>
    ③ <strong>"Kafka 消息天然有序"</strong>——错。只在<strong>单 partition 内</strong>有序，跨 partition 不保证。<br>
    ④ <strong>"Kafka 能无限堆积"</strong>——错。受磁盘和保留策略限制，超期消息会被删除。<br>
    ⑤ <strong>"RabbitMQ 能做日志收集"</strong>——能，但不擅长。海量小消息会让 RabbitMQ 性能急剧下降，Kafka 顺序写盘更合适。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('核心对比', compareTable)}
    ${section('架构差异', archTable)}
    ${section('典型场景与推荐', scenarioTable)}
    ${section('选型决策', decisionBox)}
    ${section('相同点', commonBox)}
    ${section('常见误区', pitfallBox)}`);
}
