function renderRabbitmq(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('warning',
    `<strong>RabbitMQ 三个核心概念：Producer → Exchange → Queue → Consumer</strong><br><br>
    消息不直接投递到队列，而是先发到 <strong>Exchange（交换机）</strong>，再由 Exchange 按路由规则分发到绑定的队列：<br>
    • <code>direct</code>——精确匹配 routingKey，点对点<br>
    • <code>topic</code>——通配符匹配（<code>*</code> 一个词，<code>#</code> 多个词），发布/订阅<br>
    • <code>fanout</code>——广播，无视 routingKey，发给所有绑定队列<br><br>
    前端类比：Exchange 就像 Event Bus，routingKey 就像事件名，Queue 就像事件监听器列表。`);

  // ── 依赖配置 ──────────────────────────────────────────────────────────────────

  const depConfig = `<!-- pom.xml -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>`;

  const ymlConfig = `# application.yml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    virtual-host: /
    listener:
      simple:
        acknowledge-mode: manual   # 手动 ACK，防止消息丢失
        prefetch: 1                # 每次最多拉 1 条，处理完再拉`;

  const configPair = codeBlocksRow([
    codeBlock('pom.xml 依赖', 'dot-orange', 'xml', depConfig),
    codeBlock('application.yml 配置', 'dot-blue', 'yaml', ymlConfig),
  ]);

  // ── Exchange / Queue 声明 ─────────────────────────────────────────────────────

  const declareCode = `@Configuration
public class RabbitConfig {

  public static final String ORDER_EXCHANGE = "order.exchange";
  public static final String ORDER_QUEUE    = "order.queue";
  public static final String ORDER_KEY      = "order.created";

  // 1. 声明 Exchange（direct 类型，持久化，服务重启不丢失）
  @Bean
  public DirectExchange orderExchange() {
    return new DirectExchange(ORDER_EXCHANGE, true, false);
  }

  // 2. 声明 Queue（持久化）
  @Bean
  public Queue orderQueue() {
    return QueueBuilder.durable(ORDER_QUEUE)
        // 绑定死信交换机（消息过期/拒绝时转发到死信队列）
        .withArgument("x-dead-letter-exchange", "dlx.exchange")
        .withArgument("x-dead-letter-routing-key", "dlx.order")
        .withArgument("x-message-ttl", 30000)  // 消息 30s 未消费则进死信
        .build();
  }

  // 3. 绑定 Queue → Exchange（通过 routingKey）
  @Bean
  public Binding orderBinding(Queue orderQueue, DirectExchange orderExchange) {
    return BindingBuilder.bind(orderQueue).to(orderExchange).with(ORDER_KEY);
  }
}`;

  const declareBlock = codeBlock('RabbitConfig.java——Exchange/Queue 声明', 'dot-orange', 'java', declareCode);

  // ── 生产者 ────────────────────────────────────────────────────────────────────

  const producerBox = ruleBox('info',
    `<strong>生产者：RabbitTemplate 发送消息</strong><br><br>
    推荐开启<strong>发送确认（Publisher Confirm）</strong>，确保消息真正到达 Exchange；
    再开启<strong>退回回调（Publisher Returns）</strong>，捕获 Exchange → Queue 路由失败的消息。`);

  const producerCode = `@Service
@RequiredArgsConstructor
@Slf4j
public class OrderMessageProducer {

  private final RabbitTemplate rabbitTemplate;

  public void sendOrderCreated(OrderDTO order) {
    // convertAndSend(exchange, routingKey, message)
    rabbitTemplate.convertAndSend(
        RabbitConfig.ORDER_EXCHANGE,
        RabbitConfig.ORDER_KEY,
        order,
        message -> {
          // 设置消息属性：持久化 + 过期时间
          message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
          return message;
        }
    );
    log.info("订单消息已发送: orderId={}", order.getId());
  }
}`;

  const publisherConfirmYml = `# application.yml——开启发送确认
spring:
  rabbitmq:
    publisher-confirm-type: correlated  # 异步确认
    publisher-returns: true             # 开启退回回调
    template:
      mandatory: true                   # 路由失败时触发 Returns 而非丢弃`;

  const producerPair = codeBlocksRow([
    codeBlock('发送消息', 'dot-green', 'java', producerCode),
    codeBlock('发送确认配置', 'dot-blue', 'yaml', publisherConfirmYml),
  ]);

  // ── 消费者 ────────────────────────────────────────────────────────────────────

  const consumerBox = ruleBox('success',
    `<strong>消费者：@RabbitListener + 手动 ACK</strong><br><br>
    手动 ACK 三种结果：<br>
    • <code>channel.basicAck()</code>——消费成功，从队列删除<br>
    • <code>channel.basicNack(requeue=true)</code>——消费失败，<strong>重新入队</strong>（注意无限重试风险）<br>
    • <code>channel.basicNack(requeue=false)</code>——消费失败，<strong>进死信队列</strong>（推荐）`);

  const consumerCode = `@Component
@Slf4j
public class OrderMessageConsumer {

  @RabbitListener(queues = RabbitConfig.ORDER_QUEUE)
  public void handleOrderCreated(
      OrderDTO order,
      Message message,
      Channel channel) throws IOException {

    long deliveryTag = message.getMessageProperties().getDeliveryTag();
    try {
      log.info("收到订单消息: orderId={}", order.getId());

      // ── 业务处理 ────────────────────────────────────────────
      processOrder(order);

      // ① 处理成功：ACK，消息从队列删除
      channel.basicAck(deliveryTag, false);

    } catch (BusinessException e) {
      // ② 业务异常（如库存不足）：不重试，直接进死信队列
      log.warn("订单处理业务异常: {}", e.getMessage());
      channel.basicNack(deliveryTag, false, false);  // requeue=false

    } catch (Exception e) {
      // ③ 系统异常（如 DB 连接中断）：重新入队，等下次消费
      log.error("订单处理系统异常，重新入队", e);
      channel.basicNack(deliveryTag, false, true);   // requeue=true
    }
  }

  private void processOrder(OrderDTO order) {
    // 实际业务逻辑（扣库存、创建订单记录等）
  }
}`;

  const consumerBlock = codeBlock('OrderMessageConsumer.java——手动 ACK 消费者', 'dot-green', 'java', consumerCode);

  // ── 死信队列 ─────────────────────────────────────────────────────────────────

  const dlxBox = ruleBox('danger',
    `<strong>死信队列（DLX）——消息兜底处理</strong><br><br>
    以下三种情况消息会进死信队列：<br>
    1. <code>basicNack(requeue=false)</code> 拒绝且不重新入队<br>
    2. 消息在队列中超过 <code>x-message-ttl</code> 过期时间<br>
    3. 队列达到 <code>x-max-length</code> 最大长度，溢出的旧消息<br><br>
    死信队列本质也是普通队列，绑定到死信交换机后正常消费——用于人工排查、告警、补偿处理。`);

  const dlxConfig = `@Configuration
public class DeadLetterConfig {

  @Bean
  public DirectExchange dlxExchange() {
    return new DirectExchange("dlx.exchange", true, false);
  }

  @Bean
  public Queue dlxOrderQueue() {
    return QueueBuilder.durable("dlx.order.queue").build();
  }

  @Bean
  public Binding dlxOrderBinding() {
    return BindingBuilder
        .bind(dlxOrderQueue())
        .to(dlxExchange())
        .with("dlx.order");
  }
}`;

  const dlxConsumer = `@Component
@Slf4j
public class DeadLetterConsumer {

  // 监听死信队列，做告警或人工补偿
  @RabbitListener(queues = "dlx.order.queue")
  public void handleDeadLetter(OrderDTO order, Message message, Channel channel)
      throws IOException {

    log.error("死信消息告警: orderId={}, 原因={}",
        order.getId(),
        message.getMessageProperties().getHeaders().get("x-death"));

    // 发钉钉/企微告警，或写入补偿表等待人工处理
    channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
  }
}`;

  const dlxPair = codeBlocksRow([
    codeBlock('死信 Exchange/Queue 声明', 'dot-red', 'java', dlxConfig),
    codeBlock('死信消费者（告警/补偿）', 'dot-yellow', 'java', dlxConsumer),
  ]);

  // ── 常见场景速查 ──────────────────────────────────────────────────────────────

  const scenarioRows = [
    ['下单后异步处理', 'direct exchange', '发送 order.created 消息，异步扣库存/发短信'],
    ['广播通知所有服务', 'fanout exchange', '如配置变更，通知所有实例刷新缓存'],
    ['多类型事件路由', 'topic exchange', 'order.#、payment.# 用一个 Exchange 分发'],
    ['延迟任务', 'TTL + 死信队列', '消息 N 秒后过期进死信，死信消费者执行延迟逻辑'],
    ['消息幂等', '业务 ID 去重', '消费前查 Redis/DB，已处理过则 ACK 跳过'],
    ['消息可靠投递', 'Publisher Confirm + 重试表', '发送失败写 DB，定时任务扫描补发'],
  ];

  const scenarioHeaderHtml = `
    <div class="compare-card-header" style="grid-template-columns: 1fr 1.4fr 2fr">
      <div class="compare-card-header-cell frontend">场景</div>
      <div class="compare-card-header-cell java">方案</div>
      <div class="compare-card-header-cell desc">说明</div>
    </div>`;

  const scenarioRowsHtml = scenarioRows.map(([scene, solution, note]) => `
    <div class="compare-card-row" style="grid-template-columns: 1fr 1.4fr 2fr">
      <div class="compare-card-cell frontend">${escHtml(scene)}</div>
      <div class="compare-card-cell java">${escHtml(solution)}</div>
      <div class="compare-card-cell desc">${escHtml(note)}</div>
    </div>`).join('');

  const scenarioTable = `<div class="compare-card">${scenarioHeaderHtml}${scenarioRowsHtml}</div>`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('依赖与连接配置', configPair)}
    ${section('Exchange / Queue 声明', declareBlock)}
    ${section('生产者——发送消息', producerBox + producerPair)}
    ${section('消费者——手动 ACK', consumerBox + consumerBlock)}
    ${section('死信队列（DLX）', dlxBox + dlxPair)}
    ${section('常见场景速查', scenarioTable)}`);
}
