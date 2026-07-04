function renderNacos(t) {

  const conclusion = ruleBox('accent',
    `<strong>Nacos = Naming and Configuration Service，阿里开源的"服务发现 + 配置中心"二合一中间件。</strong><br><br>
    它解决分布式系统中两个最基础的问题：<br>
    • <strong>服务发现</strong>：服务实例 IP 经常变（扩容、宕机、迁移），调用方怎么找到目标？<br>
    • <strong>配置中心</strong>：几十上百个实例的配置（数据库地址、限流阈值）怎么统一管理、动态生效？<br><br>
    前端类比：Nacos 类似前端的 <code>service worker</code> + <code>.env</code>——前者帮请求找到对的服务，后者集中管理环境变量。只不过 Nacos 是后端分布式场景下的"通讯录 + 配置文件柜"。`);

  // ── 双重职责 ──────────────────────────────────────────────────────────────────────

  const roleRows = [
    ['服务发现 (Naming)',   '服务注册 + 服务发现',     'provider 启动时注册 IP，consumer 查询可用实例列表',  '订单服务调用用户服务，先问 Nacos 拿地址'],
    ['配置中心 (Config)',   '集中管理 + 动态推送',     '应用启动时拉配置，运行中监听变更',                '限流阈值从 100 改 200，无需重启'],
    ['健康检查',            '实例存活探测',            '心跳续约，超时摘除',                                '某实例 30s 无心跳，Nacos 标记为不健康'],
    ['命名空间隔离',        '多环境 / 多租户',         'dev / test / prod 互不影响',                       '测试环境的配置不会污染生产'],
  ];
  const roleTable = compareCard(roleRows, ['职责', '一句话', '机制', '示例']);

  // ── 服务发现流程 ──────────────────────────────────────────────────────────────────

  const discoveryCode = `// 1. Provider 启动时注册自己
@SpringBootApplication
@EnableDiscoveryClient
public class OrderServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(OrderServiceApplication.class, args);
  }
}

// application.yml
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
        service: order-service

// 2. Consumer 通过 Nacos 拿到实例列表，由 Ribbon/LoadBalancer 选一个调用
@Service
public class OrderClient {

  @Autowired
  private RestTemplate restTemplate;

  // 服务名作为 URL 主机，由负载均衡器替换为真实 IP
  public UserDTO getUser(Long id) {
    return restTemplate.getForObject(
        "http://user-service/api/user/" + id, UserDTO.class);
  }
}`;

  const discoveryBlock = codeBlock('服务发现：注册 + 发现', 'dot-orange', 'java', discoveryCode);

  const discoveryBox = ruleBox('info',
    `<strong>注册中心的核心流程：</strong><br><br>
    ① <strong>注册</strong>：provider 启动时把自己的 IP:port + 服务名上报到 Nacos<br>
    ② <strong>心跳</strong>：每 5s 发一次心跳续约，告知"我还活着"<br>
    ③ <strong>发现</strong>：consumer 调用前先查 Nacos，拿到可用实例列表<br>
    ④ <strong>负载均衡</strong>：consumer 侧的 Ribbon/LoadBalancer 选一个实例发起请求<br>
    ⑤ <strong>摘除</strong>：心跳超时（默认 15s）Nacos 标记不健康，30s 还不续约则剔除`);

  // ── 配置中心流程 ──────────────────────────────────────────────────────────────────

  const configCode = `// 1. 在 Nacos 控制台创建配置
//    dataId = order-service-dev.yaml
//    group = DEFAULT_GROUP
//    content:
//    order:
//      max-amount: 10000
//      timeout: 3000

// 2. bootstrap.yml 指定从 Nacos 拉配置
spring:
  application:
    name: order-service
  cloud:
    nacos:
      config:
        server-addr: 127.0.0.1:8848
        file-extension: yaml

// 3. 业务代码注入配置，支持动态刷新
@RestController
@RefreshScope   // 配置变更后自动重新注入
public class OrderController {

  @Value("\${order.max-amount}")
  private long maxAmount;

  @PostMapping("/order")
  public Result create(@RequestBody OrderDTO dto) {
    if (dto.getAmount() > maxAmount) {
      throw new BizException("超过单笔限额 " + maxAmount);
    }
    return orderService.create(dto);
  }
}`;

  const configBlock = codeBlock('配置中心：动态刷新', 'dot-green', 'java', configCode);

  const configBox = ruleBox('success',
    `<strong>配置中心的关键能力是"动态刷新"。</strong><br><br>
    • <strong>启动时</strong>：从 Nacos 拉配置覆盖本地 <code>application.yml</code><br>
    • <strong>运行时</strong>：在 Nacos 控制台改配置 → Nacos 长轮询推送 → <code>@RefreshScope</code> Bean 重建<br>
    • <strong>不重启</strong>：限流阈值、开关、白名单都能秒级生效<br><br>
    <strong>对比前端</strong>：相当于把 <code>.env</code> 文件搬到服务端，改完不需要重新构建部署。`);

  // ── 核心概念 ──────────────────────────────────────────────────────────────────────

  const conceptRows = [
    ['Namespace 命名空间', '最外层隔离，常用作环境区分',      'dev / test / prod 互相不可见'],
    ['Group 组',          '次级隔离，常用作业务线或项目',      'DEFAULT_GROUP / TRADE_GROUP'],
    ['Data ID 数据 ID',   '具体某份配置 / 某个服务',           'order-service-dev.yaml'],
    ['Service 服务',       '一组具有相同逻辑功能的实例集合',     'user-service 包含 3 个实例'],
    ['Instance 实例',     '一个具体的进程（IP:port）',          '10.0.0.1:8080'],
    ['Cluster 集群',      '同一机房内的实例分组',               'bj-cluster / sh-cluster'],
  ];
  const conceptTable = compareCard(conceptRows, ['概念', '作用', '示例']);

  const conceptBox = ruleBox('warning',
    `<strong>隔离层级（从大到小）：</strong><br>
    <code>Namespace &gt; Group &gt; Service &gt; Cluster &gt; Instance</code><br><br>
    <strong>实战建议：</strong>Namespace 用于环境隔离（dev/test/prod 必须严格分开），Group 用于业务线隔离，Cluster 用于机房隔离。层级太深难管理，太浅会乱。`);

  // ── 与同类产品对比 ────────────────────────────────────────────────────────────────

  const compareRows = [
    ['Eureka',       '服务发现',    'AP 模型，已停止维护',         'Spring Cloud Netflix 老项目'],
    ['Consul',       '服务发现 + KV', 'CP 模型（Raft）+ 自带健康检查', 'Go 生态、多数据中心'],
    ['ZooKeeper',    '协调锁 + 配置', 'CP 模型（ZAB），重',           'Kafka 元数据、Dubbo 老版'],
    ['etcd',          'KV + 配置',   'CP 模型（Raft），K8s 御用',     'K8s 状态存储、CoreDNS'],
    ['Apollo',        '配置中心',    '配置专注、权限完善',            '携程开源，纯配置场景'],
    ['Nacos',         '发现 + 配置', 'AP/CP 可切换，二合一',          'Spring Cloud Alibaba 生态'],
  ];
  const compareTable = compareCard(compareRows, ['产品', '主要能力', '特点', '适用场景']);

  const compareBox = ruleBox('accent',
    `<strong>Nacos 的优势：</strong>二合一（发现 + 配置）、AP/CP 可切换、中文文档完善、Spring Cloud Alibaba 集成度高。<br>
    <strong>劣势：</strong>生态偏阿里系，非 Spring Cloud Alibaba 项目集成成本高；配置管理能力不如 Apollo 细致（权限、灰度）。`);

  // ── CAP 模式 ──────────────────────────────────────────────────────────────────────

  const capRows = [
    ['AP 模式（默认）', '高可用优先',     '网络分区时各节点独立服务，最终一致',  '互联网业务、容忍短期不一致'],
    ['CP 模式',          '强一致优先',     'Raft 协议，少数派分区拒绝服务',     '配置变更需要强一致的场景'],
  ];
  const capTable = compareCard(capRows, ['模式', '语义', '机制', '场景']);

  const capBox = ruleBox('info',
    `<strong>切换方式：</strong>Nacos 集群默认 AP，可以通过配置切换为 CP。<br>
    • <strong>AP</strong>：每个节点都能写，互相同步，分区时不阻塞——适合服务发现（实例列表临时不一致可接受）<br>
    • <strong>CP</strong>：Raft 选主，写入需过半节点确认——适合配置中心（同一份配置所有节点必须一致）<br><br>
    实际部署中，<strong>服务发现用 AP，配置中心用 CP</strong>，Nacos 同时支持两种模式。`);

  // ── 健康检查 ──────────────────────────────────────────────────────────────────────

  const healthRows = [
    ['临时实例',  '客户端主动心跳', '5s 心跳 / 15s 不健康 / 30s 摘除',  '微服务应用实例（默认）'],
    ['永久实例',  '服务端主动探测',  'Nacos 主动 HTTP/TCP 探测',         '数据库、缓存等基础设施'],
  ];
  const healthTable = compareCard(healthRows, ['类型', '检查方式', '机制', '适用']);

  const healthBox = ruleBox('warning',
    `<strong>临时 vs 永久实例的本质区别：</strong>客户端挂了谁来发现？<br>
    • <strong>临时实例</strong>：客户端不心跳 → Nacos 等待超时 → 摘除。客户端负责"申报存活"。<br>
    • <strong>永久实例</strong>：Nacos 主动探测 → 探测失败标记不健康，但<strong>不摘除</strong>（运维需手动处理）。<br>
    <strong>why</strong>：数据库这类基础设施，宕机后通常会重启而非消失，"不摘除"是让运维知道它出问题了。`);

  // ── 前端类比 ──────────────────────────────────────────────────────────────────────

  const feBox = ruleBox('info',
    `<strong>前端工程师怎么看 Nacos？</strong><br><br>
    • <strong>服务发现</strong> ≈ 前端的 <code>Service Worker</code> 路由 + CDN 调度：你访问 <code>api.example.com</code>，背后哪台机器响应，由"调度层"决定<br>
    • <strong>配置中心</strong> ≈ 前端的远程 <code>.env</code> + 热更新：把开关、阈值放到服务端，运行时拉取，不需要重新构建<br>
    • <strong>命名空间</strong> ≈ 前端的 <code>.env.development</code> / <code>.env.production</code>，按环境隔离<br>
    • <strong>监听变更</strong> ≈ 前端的长轮询 / WebSocket，配置一改推到客户端<br><br>
    <strong>一句话：</strong>微服务架构里，Nacos 是"通讯录 + 配置文件柜"，每个微服务都得先去它那里"报到"。`);

  // ── 常见误区 ──────────────────────────────────────────────────────────────────────

  const pitfallBox = ruleBox('danger',
    `<strong>常见误区：</strong><br><br>
    ① <strong>"Nacos 只是服务发现"</strong>——错。配置中心同样是核心能力，很多团队只用发现不用配置是浪费。<br>
    ② <strong>"配置中心什么配置都该放"</strong>——错。敏感信息（密码、密钥）应放密钥管理（Vault/KMS），而非 Nacos。<br>
    ③ <strong>"Nacos 高可用 = 单节点也行"</strong>——错。Nacos 自身必须集群部署（至少 3 节点），否则单点故障全集群瘫痪。<br>
    ④ <strong>"实例下线就立即从 Nacos 消失"</strong>——错。临时实例有 30s 摘除延迟，期间 consumer 可能拿到死实例，需要 Ribbon 重试 + 熔断兜底。<br>
    ⑤ <strong>"配置改了立即生效"</strong>——半错。<code>@RefreshScope</code> Bean 才会重建，普通 <code>@Value</code> 注入的字段不会变。<br>
    ⑥ <strong>"Nacos 和 Eureka 一样"</strong>——表面相似，但 Nacos 支持 CP/AP 切换、自带配置中心、健康检查更灵活，Eureka 已停止维护。<br><br>
    <strong>正确姿势：</strong>集群部署、敏感配置走密钥管理、客户端做好重试与熔断、监听变更用 <code>@RefreshScope</code>。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('Nacos 的双重职责', roleTable)}
    ${section('服务发现：注册 + 发现', discoveryBox + discoveryBlock)}
    ${section('配置中心：动态刷新', configBox + configBlock)}
    ${section('核心概念层级', conceptTable + conceptBox)}
    ${section('与同类产品对比', compareTable + compareBox)}
    ${section('CAP 模式：AP vs CP', capTable + capBox)}
    ${section('健康检查：临时 vs 永久实例', healthTable + healthBox)}
    ${section('前端工程师怎么看 Nacos？', feBox)}
    ${section('常见误区', pitfallBox)}`);
}
