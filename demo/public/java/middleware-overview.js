function renderMiddlewareOverview(t) {

  const conclusion = ruleBox('accent',
    `<strong>中间件 = 介于操作系统与应用之间、提供通用能力的独立软件层。</strong><br><br>
    核心特征：<strong>独立部署、复用能力、解耦业务</strong>。<br>
    它不是你写业务代码时 import 的库（那是 SDK / 包），而是<strong>单独运行在另一台机器/进程</strong>上，通过协议（TCP/HTTP/AMQP/Redis 协议）为多个应用提供公共服务。<br><br>
    前端类比：前端没有"中间件"概念，最接近的是 <strong>BFF + 独立服务</strong>。比如你部署一个独立的 Redis 给多个前端 BFF 用，那 Redis 就是中间件；而你 <code>import redis</code> 的客户端 SDK 只是连接器，不是中间件本身。`);

  // ── 为什么需要中间件 ──────────────────────────────────────────────────────────────

  const whyRows = [
    ['重复造轮子',     '每个应用都自实现消息队列、缓存、连接池', '团队 A 写一份、团队 B 写一份，质量参差'],
    ['能力共享难',     '跨语言、跨团队共享通用能力',           'Java 团队写的连接池 Go 团队用不了'],
    ['业务耦合',       '业务代码里混着缓存、MQ、搜索逻辑',      '换一个 Redis 实例要改 50 个文件'],
    ['运维成本',       '每个应用自己管可用性、持久化',           '缓存丢了、消息丢了，业务自己兜底'],
  ];
  const whyTable = compareCard(whyRows, ['痛点', '没有中间件时', '典型场景']);

  // ── 中间件的核心特征 ──────────────────────────────────────────────────────────────

  const featureRows = [
    ['独立进程',   '单独部署、独立运维，不是业务代码的一部分',  'Redis、RabbitMQ、MySQL 各自独立运行'],
    ['网络访问',   '通过协议对外提供服务，跨语言通用',          'Java/Go/Python 都能用 Redis 协议连同一个 Redis'],
    ['通用能力',   '解决一类共性问题，不含业务逻辑',             '消息队列只管投递，不知道消息是订单还是评论'],
    ['复用解耦',   '多个应用共享同一份能力，业务只关心接口',     '订单服务和用户服务共用一个 Redis 集群'],
    ['独立演化',   '升级、扩容不影响业务应用',                  'Redis 从单机升到集群，业务代码不动'],
  ];
  const featureTable = compareCard(featureRows, ['特征', '说明', '示例']);

  // ── 中间件 vs 库 vs 框架 ──────────────────────────────────────────────────────────

  const diffRows = [
    ['库 (Library)',   '编译期打进包，被应用调用',     'Lodash、Guava、Jackson',  '没有'],
    ['框架 (Framework)', '定义应用骨架，控制反转',       'Spring、Vue、Express',    '通常没有'],
    ['中间件 (Middleware)', '独立运行、通过网络提供服务', 'Redis、RabbitMQ、MySQL',  '有，是核心'],
    ['平台 (Platform)', '打包完整的运行环境与生态',       'K8s、阿里云 ACK',          '有'],
  ];
  const diffTable = compareCard(diffRows, ['形态', '关系', '例子', '独立进程?']);

  // ── 常见中间件分类 ────────────────────────────────────────────────────────────────

  const categoryRows = [
    ['消息队列',     '异步、解耦、削峰',                'RabbitMQ / Kafka / RocketMQ'],
    ['缓存',         '加速读、降低 DB 压力',            'Redis / Memcached'],
    ['数据库',       '持久化结构化数据',                'MySQL / PostgreSQL / MongoDB'],
    ['RPC 注册中心', '服务发现、远程调用',              'Nacos / Consul / Eureka'],
    ['配置中心',     '动态配置、热更新',                'Nacos / Apollo / etcd'],
    ['网关',         '统一入口、鉴权、限流',            'Spring Cloud Gateway / Nginx / Kong'],
    ['搜索',         '全文检索、复杂查询',              'Elasticsearch / OpenSearch'],
    ['协调锁',       '分布式锁、配置、选主',            'ZooKeeper / etcd'],
    ['日志/链路',    '日志收集、Trace 串联',            'ELK / SkyWalking / OpenTelemetry'],
  ];
  const categoryTable = compareCard(categoryRows, ['类别', '解决的问题', '代表产品']);

  // ── 前端类比 ──────────────────────────────────────────────────────────────────────

  const frontendBox = ruleBox('info',
    `<strong>前端工程师怎么理解中间件？</strong><br><br>
    • 前端的 <code>app.use(cors)</code> 叫"中间件"是<strong>命名借用</strong>——本质是函数组合（pipeline），不是后端中间件。<br>
    • 真正对等的概念：<strong>你独立部署的 BFF、独立运行的 SSR 服务、CDN 边缘节点</strong>，这些才是"前端侧的中间件"。<br>
    • 你写 <code>fetch('/api/orders')</code>，背后经过 Nginx 网关、Redis 缓存、MySQL 数据库、RabbitMQ 异步通知——每一跳都是中间件。<br><br>
    <strong>一句话：</strong>中间件是"应用之间的基础设施层"，前端工程越往后做越绕不开它。`);

  // ── 选型原则 ──────────────────────────────────────────────────────────────────────

  const principleRows = [
    ['按需引入',     '先看真痛点，不要跟风堆中间件',     '业务还没跑通就上 Kafka，运维成本爆炸'],
    ['运维优先',     '团队是否 hold 得住',              '用 RabbitMQ 团队没人懂镜像队列，挂了没人救'],
    ['成熟优先',     '选社区活跃、文档丰富的',           '生产慎用小众中间件，遇到 bug 找不到人'],
    ['可观测',       '必须有监控、告警、日志',           'Redis 连接池满了你都不知道'],
    ['避免重叠',     '一个能力一个中间件，不要多个重叠', '同时用 Redis 和 Memcached 做缓存是负担'],
    ['数据安全',     '持久化、备份、灾备',               '消息队列丢消息比慢更可怕'],
  ];
  const principleTable = compareCard(principleRows, ['原则', '要点', '反例']);

  // ── 常见误区 ──────────────────────────────────────────────────────────────────────

  const pitfallBox = ruleBox('danger',
    `<strong>关于中间件的常见误区：</strong><br><br>
    ① <strong>"中间件越多越专业"</strong>——错。每个中间件都是一份运维负债、一个故障点。<br>
    ② <strong>"引入中间件就解决性能问题"</strong>——错。中间件是工具不是银弹，业务没设计好引入 MQ 反而让链路更复杂。<br>
    ③ <strong>"中间件 = 消息队列"</strong>——错。消息队列只是中间件的一类，Redis、MySQL、Nginx 也都是中间件。<br>
    ④ <strong>"中间件天然高可用"</strong>——错。Redis 单节点也会挂、MQ 也会脑裂，高可用要专门配置（主从、集群、镜像队列）。<br><br>
    <strong>正确姿势：</strong>能不引就不引、能少引就少引、引入就要做好监控和兜底。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('为什么需要中间件？', whyTable)}
    ${section('中间件的核心特征', featureTable)}
    ${section('库 / 框架 / 中间件 / 平台 的区别', diffTable)}
    ${section('常见中间件分类', categoryTable)}
    ${section('前端工程师怎么看中间件？', frontendBox)}
    ${section('选型原则', principleTable)}
    ${section('常见误区', pitfallBox)}`);
}
