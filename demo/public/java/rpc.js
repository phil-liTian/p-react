function renderRpc(t) {

  // ── 核心结论 ──────────────────────────────────────────────────────────────────

  const conclusion = ruleBox('accent',
    `<strong>RPC（Remote Procedure Call，远程过程调用）= 让调用远程服务像调用本地方法一样。</strong><br><br>
    本质是<strong>对网络通信的封装</strong>：调用方 <code>userService.findById(123)</code>，<code>userService</code> 是个"假对象"（代理 / Stub），它把方法名、参数序列化成字节流，通过网络发给提供方；提供方反序列化后调用真实方法，再把结果序列化回传。<br><br>
    前端类比：RPC ≈ <strong>axios + 自动生成的 SDK</strong>——你写 <code>userApi.getUser(123)</code>，背后 axios 帮你发 HTTP 请求。RPC 框架做的就是把"网络 + 序列化 + 路由"全自动化，让远程调用<strong>看起来是本地方法</strong>。`);

  // ── RPC 调用流程（10 步）──────────────────────────────────────────────────────

  const flowCode = `// ─────────────────────────────────────────────────────────────────
// RPC 完整调用流程（10 步）
// ─────────────────────────────────────────────────────────────────
//
//  [调用方 Consumer]                              [提供方 Provider]
//
//  ①  userService.findById(123)
//      ↓ 调用的是本地 Stub（动态代理生成的假对象）
//
//  ②  Stub.invoke("findById", [123])
//      ↓ 拦截方法调用，拿到方法名 + 参数
//
//  ③  Serialize("findById", [123]) → byte[]
//      ↓ 序列化：Java 对象 → 二进制（Hessian/Kryo/Protobuf）
//
//  ④  从注册中心(Nacos)查找 user-service 实例列表
//      ↓ 负载均衡选一个：10.0.0.5:20880
//
//  ⑤  Network.send(10.0.0.5:20880, byte[])
//      ↓ 通过 TCP 长连接发送（Dubbo）/ HTTP/2（gRPC）
//
//                                              ⑥  Network.receive(byte[])
//                                                  ↓ 服务端接收到字节流
//
//                                              ⑦  Deserialize(byte[])
//                                                  → "findById", [123]
//                                                  ↓ 反序列化恢复方法名 + 参数
//
//                                              ⑧  Reflection.invoke(
//                                                    userServiceImpl, "findById", 123)
//                                                  ↓ 通过反射调用真实实现类
//
//                                              ⑨  Serialize(userDTO) → byte[]
//                                                  ↓ 把返回值序列化
//
//  ⑩  Network.receive → Deserialize → UserDTO
//      ↓ 调用方拿到结果，像本地调用一样 return
//
//  返回给业务代码：UserDTO user = userService.findById(123);
//
// ─────────────────────────────────────────────────────────────────
// 关键：①~⑤ 在 Consumer 侧（Stub 完成），⑥~⑨ 在 Provider 侧（Skeleton 完成）
// 对业务代码完全透明，调用方感受不到网络`;

  const flowBox = ruleBox('info',
    `<strong>RPC 的核心是"代理 + 序列化 + 网络"三层封装。</strong><br><br>
    • <strong>Stub（客户端存根）</strong>：调用方拿到的"代理对象"，拦截方法调用，负责序列化 + 发送<br>
    • <strong>Skeleton（服务端骨架）</strong>：提供方接收请求，反序列化 + 反射调用真实方法<br>
    • <strong>注册中心</strong>：服务发现——Consumer 通过服务名查到 Provider 真实 IP<br>
    • <strong>序列化协议</strong>：对象 ↔ 字节流互转（Hessian / Protobuf / Kryo）<br>
    • <strong>传输协议</strong>：TCP 长连接（Dubbo）或 HTTP/2（gRPC）`);

  // ── 三种主流 RPC 形态对比 ─────────────────────────────────────────────────────

  const formRows = [
    ['Dubbo',   'TCP + 自定义协议',  'Hessian2 / Kryo',  '阿里开源，Spring Cloud Alibaba 生态，国内主流'],
    ['gRPC',    'HTTP/2',           'Protobuf',          'Google 开源，跨语言，云原生标配'],
    ['OpenFeign','HTTP',            'JSON',              'Spring Cloud 声明式 RPC，本质是封装 HTTP 调用'],
    ['Thrift',  'TCP + 自定义协议',  'Thrift 二进制',     'Facebook 开源，跨语言，国内用得少'],
    ['Motan',   'TCP + 自定义协议',  'Hessian2',          '微博开源，类似 Dubbo'],
    ['brpc',    'TCP',              'Protobuf / Thrift', '百度开源，C++ 高性能场景'],
  ];
  const formTable = compareCard(formRows, ['框架', '传输协议', '序列化', '特点']);

  // ── Dubbo 调用链路详解 ────────────────────────────────────────────────────────

  const dubboArchCode = `// Dubbo 调用链路（核心组件）
//
//   Consumer 调用链：
//
//   UserService.findById(123)
//        ↓
//   [Proxy 代理]  ←  javassist 动态生成，业务无感知
//        ↓
//   [InvokerInvocationHandler]  ←  拦截方法调用
//        ↓
//   [MockClusterInvoker]  ←  Mock 降级
//        ↓
//   [FailoverClusterInvoker]  ←  集群容错：失败自动切换
//        ↓
//   [LoadBalance]  ←  负载均衡：Random / RoundRobin / LeastActive
//        ↓
//   [Filter Chain]  ←  过滤器链：日志 / 限流 / 链路追踪
//        ↓
//   [DubboInvoker]  ←  实际发起远程调用
//        ↓
//   [ExchangeClient]  ←  封装 TCP 长连接
//        ↓
//   [NettyClient]  ←  真正的网络层（Netty NIO）
//        ↓
//   ─── TCP 网络 ───
//
//   Provider 调用链（服务端逆向处理）：
//
//   ─── TCP 网络 ───
//        ↓
//   [NettyServer]  ←  接收网络请求
//        ↓
//   [ExchangeHandler]  ←  解码 Dubbo 协议
//        ↓
//   [Filter Chain]  ←  服务端过滤器
//        ↓
//   [DubboProtocol]  ←  根据服务名找到 Exporter
//        ↓
//   [Exporter]  ←  持有真实实现类引用
//        ↓
//   [Wrapper.invokeMethod]  ←  反射调用 UserServiceImpl.findById(123)
//        ↓
//   返回 UserDTO，按原路序列化回去`;

  const dubboArchBox = ruleBox('warning',
    `<strong>Dubbo 调用链路的精髓：每一层都是"包装 + 委派"。</strong><br><br>
    • <strong>Proxy</strong>：让远程调用像本地方法<br>
    • <strong>Cluster</strong>：处理集群容错（失败重试、快速失败、失败安全）<br>
    • <strong>LoadBalance</strong>：多实例间负载均衡<br>
    • <strong>Filter</strong>：横切逻辑（日志、限流、Trace）<br>
    • <strong>Invoker</strong>：真正发起调用<br>
    • <strong>Protocol</strong>：协议封装（Dubbo 协议头 + 序列化体）<br><br>
    这套设计像<strong>洋葱模型</strong>——和前端的 Express/Koa 中间件、React 的 HOC 是同一思想：层层包裹、职责分离。`);

  // ── Dubbo 完整代码示例 ────────────────────────────────────────────────────────

  const dubboProviderCode = `// ── Provider 服务提供方 ──────────────────────────────

// 1. 定义服务接口（独立 jar 包，双方共用）
public interface UserService {
  UserDTO findById(Long id);
}

// 2. 实现服务（Provider 内部）
@DubboService      // 暴露为 Dubbo 服务
public class UserServiceImpl implements UserService {
  @Override
  public UserDTO findById(Long id) {
    return userMapper.selectById(id);
  }
}

// 3. application.yml
dubbo:
  application:
    name: user-service-provider
  protocol:
    name: dubbo
    port: 20880
  registry:
    address: nacos://127.0.0.1:8848   # 注册到 Nacos`;

  const dubboConsumerCode = `// ── Consumer 服务调用方 ──────────────────────────────

@Service
public class OrderService {

  // 注入远程服务代理，@DubboReference 自动生成 Stub
  @DubboReference
  private UserService userService;

  public OrderDTO createOrder(Long userId) {
    // 像本地方法一样调用，背后是完整的 RPC 流程
    UserDTO user = userService.findById(userId);

    OrderDTO order = new OrderDTO();
    order.setUserId(user.getId());
    order.setUserName(user.getName());
    return order;
  }
}

// Consumer 端 application.yml
dubbo:
  application:
    name: order-service-consumer
  registry:
    address: nacos://127.0.0.1:8848   # 同一注册中心`;

  const dubboPair = codeBlocksRow([
    codeBlock('Provider：暴露服务', 'dot-green', 'java', dubboProviderCode),
    codeBlock('Consumer：调用远程服务', 'dot-orange', 'java', dubboConsumerCode),
  ]);

  // ── gRPC 示例 ────────────────────────────────────────────────────────────────

  const grpcProtoCode = `// user.proto —— Protobuf IDL 定义服务契约
syntax = "proto3";

package com.example.user;
option java_multiple_files = true;
option java_package = "com.example.user.proto";

// 定义服务
service UserService {
  rpc findById (UserRequest) returns (UserResponse);
  rpc listUsers (ListRequest) returns (stream UserResponse);  // 服务端流
}

message UserRequest {
  int64 id = 1;
}

message UserResponse {
  int64 id = 1;
  string name = 2;
  string email = 3;
}`;

  const grpcConsumerCode = `// gRPC Consumer（Java）
public class OrderService {

  private final UserServiceGrpc.UserServiceBlockingStub userStub;

  public OrderService(ManagedChannel channel) {
    // gRPC 框架生成的 Stub，基于 HTTP/2 长连接
    this.userStub = UserServiceGrpc.newBlockingStub(channel);
  }

  public OrderDTO createOrder(long userId) {
    // 像本地方法一样调用
    UserResponse user = userStub.findById(
        UserRequest.newBuilder().setId(userId).build());

    return OrderDTO.builder()
        .userId(user.getId())
        .userName(user.getName())
        .build();
  }
}`;

  const grpcPair = codeBlocksRow([
    codeBlock('Protobuf IDL 定义服务', 'dot-blue', 'protobuf', grpcProtoCode),
    codeBlock('Consumer 调用', 'dot-orange', 'java', grpcConsumerCode),
  ]);

  const grpcBox = ruleBox('success',
    `<strong>gRPC 的核心是 Protobuf + HTTP/2。</strong><br><br>
    • <strong>Protobuf</strong>：强类型 IDL（接口定义语言），跨语言生成 Stub<br>
    • <strong>HTTP/2</strong>：多路复用、流式传输、头部压缩<br>
    • <strong>跨语言</strong>：一份 .proto 同时生成 Java/Go/Python/JS 客户端<br>
    • <strong>云原生标配</strong>：gRPC 是 K8s / Istio / Envoy 内部通信的事实标准`);

  // ── OpenFeign 示例 ───────────────────────────────────────────────────────────

  const feignCode = `// OpenFeign：声明式 HTTP RPC（Spring Cloud 生态）
//
// 1. 定义接口，加 @FeignClient —— 不需要写实现
@FeignClient(name = "user-service")  // 服务名，由 Nacos 解析为真实 IP
public interface UserServiceClient {

  @GetMapping("/api/users/{id}")
  UserDTO findById(@PathVariable("id") Long id);

  @PostMapping("/api/users")
  UserDTO create(@RequestBody CreateUserRequest req);
}

// 2. 业务代码直接注入使用
@Service
public class OrderService {

  @Autowired
  private UserServiceClient userServiceClient;  // Feign 动态生成的代理

  public OrderDTO createOrder(Long userId) {
    UserDTO user = userServiceClient.findById(userId);
    // 背后实际发的是 HTTP GET /api/users/123
    // Feign 帮你做了：Ribbon 负载均衡 + RestTemplate 调用 + 反序列化
    return OrderDTO.from(user);
  }
}`;

  const feignBox = ruleBox('info',
    `<strong>OpenFeign = HTTP 调用的"语法糖"。</strong><br><br>
    本质还是 HTTP（用 JSON 序列化），但通过<strong>接口 + 注解</strong>屏蔽了 HTTP 细节——你写的是 Java 方法，Feign 帮你拼 URL、发请求、解析 JSON。<br><br>
    <strong>与 Dubbo / gRPC 的区别：</strong>Feign 走 HTTP，性能比 TCP 二进制协议差，但<strong>跨语言友好、调试简单</strong>（一个 curl 就能复现）。`);

  // ── 序列化方式对比 ────────────────────────────────────────────────────────────

  const serialRows = [
    ['JSON',         '可读、跨语言、调试简单',      '体积大、慢、无类型',           'HTTP API、对外接口'],
    ['Protobuf',     '体积小、快、强类型',          '不可读、需 IDL 编译',          'gRPC、内部高频调用'],
    ['Hessian2',     'Java 原生、二进制',           '只适合 Java',                  'Dubbo 默认序列化'],
    ['Kryo',         'Java 中最快',                  '跨语言支持差、不兼容旧版本',    'Dubbo 可选、高性能场景'],
    ['MsgPack',      '二进制 JSON',                  '生态弱于 Protobuf',            '游戏、IoT 场景'],
    ['Thrift',       '跨语言、强类型',               '生态萎缩',                     '老系统维护'],
  ];
  const serialTable = compareCard(serialRows, ['序列化', '优点', '缺点', '场景']);

  // ── RPC vs HTTP ──────────────────────────────────────────────────────────────

  const compareHttpRows = [
    ['传输协议',     'TCP 长连接 / HTTP/2',          'HTTP/1.1 短连接为主'],
    ['序列化',       '二进制（Hessian/Protobuf）',   'JSON 文本'],
    ['性能',         '高（5x~10x 于 HTTP）',         '中'],
    ['跨语言',       'gRPC 跨语言，Dubbo 偏 Java',   '天然跨语言'],
    ['调试',         '难（二进制不可读）',           '简单（curl / Postman 直接调）'],
    ['服务发现',     '需配合注册中心',                '域名 / API 网关'],
    ['契约定义',     'IDL（.proto / 接口 jar）',     'OpenAPI / Swagger'],
    ['适用场景',     '内部服务间高频调用',           '对外 API、BFF、第三方集成'],
  ];
  const compareHttpTable = compareCard(compareHttpRows, ['维度', 'RPC', 'HTTP']);

  const compareHttpBox = ruleBox('warning',
    `<strong>选型原则：</strong><br><br>
    • <strong>内部服务间高频调用</strong> → RPC（Dubbo / gRPC）：性能高、强类型<br>
    • <strong>对外暴露 API</strong> → HTTP + JSON：跨语言、易调试、易集成<br>
    • <strong>跨语言内部通信</strong> → gRPC：Protobuf IDL 天然跨语言<br>
    • <strong>Spring Cloud 全家桶</strong> → OpenFeign：开发效率高<br><br>
    <strong>趋势：</strong>云原生时代 gRPC 成主流（K8s、Istio 都用 gRPC），但国内 Dubbo 仍占大量存量。`);

  // ── 集群容错策略 ─────────────────────────────────────────────────────────────

  const faultRows = [
    ['Failover（失败切换）',  '失败自动重试其他服务器',     '默认，适合幂等读操作',      'Dubbo 默认，重试 2 次'],
    ['Failfast（快速失败）',   '失败立即报错',               '非幂等写操作',              '下单、扣款'],
    ['Failsafe（失败安全）',   '异常忽略，仅记日志',         '写审计日志、监控上报',      '不影响主流程的操作'],
    ['Failback（失败定时重试）','失败记录，后台定时重试',     '消息通知最终一致',          '异步通知场景'],
    ['Forking（并行调用）',    '同时调多个，任一成功即返回',  '实时性要求高、资源浪费',    'ECharts 实时大屏'],
    ['Broadcast（广播）',      '所有_provider 都调用',        '刷新所有节点缓存',          '很少用'],
  ];
  const faultTable = compareCard(faultRows, ['策略', '行为', '适用', '示例']);

  // ── 负载均衡策略 ─────────────────────────────────────────────────────────────

  const lbRows = [
    ['Random',        '加权随机',                       '默认',           'Dubbo 默认，调用量小时偏差大'],
    ['RoundRobin',    '加权轮询',                       '均匀分布',       'gRPC 默认'],
    ['LeastActive',   '最少活跃调用数',                  '慢的 provider 少分配', 'Dubbo 特色，处理速度快的多分配'],
    ['ConsistentHash','一致性哈希',                      '相同参数发同一台', '带缓存的场景，避免缓存失效'],
    ['ShortestResponse','最短响应时间',                  '优先响应快的',   'Dubbo 2.7+ 新增'],
  ];
  const lbTable = compareCard(lbRows, ['策略', '机制', '适用', '说明']);

  // ── 核心难题 ─────────────────────────────────────────────────────────────────

  const challengeRows = [
    ['超时控制',   '调用必须设超时，否则线程被占满',   '<code>timeout=3000</code>，超时即失败'],
    ['重试幂等',   '失败重试必须保证业务幂等',         '查询可重试，扣款必须防重'],
    ['熔断降级',   '下游不可用时快速失败，不雪崩',     'Sentinel / Hystrix'],
    ['负载均衡',   '多实例间合理分配请求',             'Random / RoundRobin / LeastActive'],
    ['服务发现',   '实例 IP 经常变化',                  'Nacos / Eureka / Consul'],
    ['链路追踪',   '跨服务调用串联日志',               'TraceId + SkyWalking'],
    ['序列化兼容', '字段增删要兼容老版本',             'Protobuf 字段编号 + optional'],
  ];
  const challengeTable = compareCard(challengeRows, ['难题', '问题', '方案']);

  // ── 前端类比 ─────────────────────────────────────────────────────────────────

  const feBox = ruleBox('info',
    `<strong>前端工程师怎么理解 RPC？</strong><br><br>
    • <strong>Stub</strong> ≈ axios 实例 + 自动生成的 API SDK：你写 <code>userApi.getUser(123)</code>，背后是 <code>fetch('/api/users/123')</code><br>
    • <strong>序列化</strong> ≈ <code>JSON.stringify</code> / <code>JSON.parse</code>，RPC 用 Protobuf 就是用更高效的二进制<br>
    • <strong>注册中心</strong> ≈ DNS + 服务发现：把 <code>user-service</code> 解析为真实 IP<br>
    • <strong>负载均衡</strong> ≈ CDN 调度：同一个域名可能命中不同节点<br>
    • <strong>集群容错</strong> ≈ axios-retry + 熔断器：失败重试、快速失败<br>
    • <strong>OpenFeign</strong> ≈ <code>openapi-generator</code> 生成的 TS SDK——你只写接口，背后帮你发请求<br><br>
    <strong>一句话：</strong>RPC 就是"披着方法调用外衣的网络请求"，把网络细节藏起来，让分布式调用像本地调用一样自然。`);

  // ── 常见误区 ─────────────────────────────────────────────────────────────────

  const pitfallBox = ruleBox('danger',
    `<strong>常见误区：</strong><br><br>
    ① <strong>"RPC 比 HTTP 快，所以全用 RPC"</strong>——错。RPC 性能优势在内部高频调用，对外 API 用 HTTP 更易集成、调试、跨语言。<br>
    ② <strong>"RPC 调用不需要超时"</strong>——错。RPC 默认超时通常很长（如 Dubbo 1s），必须按业务设置，否则会拖垮线程池。<br>
    ③ <strong>"@DubboReference 注入的就是真实对象"</strong>——错。注入的是动态代理（Stub），所有方法调用都被拦截、序列化、网络传输。<br>
    ④ <strong>"失败重试总是安全的"</strong>——错。Failover 重试只适合<strong>幂等</strong>操作，非幂等写（下单、扣款）必须用 Failfast。<br>
    ⑤ <strong>"序列化兼容性自然搞定"</strong>——错。增删字段必须考虑前后兼容：Protobuf 用字段编号、Hessian 需 serialVersionUID。<br>
    ⑥ <strong>"RPC 框架自带事务"</strong>——错。RPC 是通信机制，跨服务事务需用分布式事务方案（Seata、TCC、本地消息表）。<br>
    ⑦ <strong>"本地能跑，RPC 也能跑"</strong>——错。本地调用传引用，RPC 传值（序列化）——大对象、循环引用、Lambda 都不能直接传。<br><br>
    <strong>正确姿势：</strong>设超时、控重试、保幂等、做熔断、用注册中心、考虑序列化兼容。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('RPC 调用流程（10 步）', flowBox + codeBlock('调用链路全景图', 'dot-blue', 'plaintext', flowCode))}
    ${section('主流 RPC 框架对比', formTable)}
    ${section('Dubbo 调用链路详解', dubboArchBox + codeBlock('Dubbo 洋葱模型', 'dot-orange', 'plaintext', dubboArchCode))}
    ${section('Dubbo 完整代码示例', dubboPair)}
    ${section('gRPC 示例（Protobuf + HTTP/2）', grpcBox + grpcPair)}
    ${section('OpenFeign 示例（声明式 HTTP RPC）', feignBox + codeBlock('Feign 声明式调用', 'dot-blue', 'java', feignCode))}
    ${section('序列化方式对比', serialTable)}
    ${section('RPC vs HTTP', compareHttpTable + compareHttpBox)}
    ${section('集群容错策略', faultTable)}
    ${section('负载均衡策略', lbTable)}
    ${section('RPC 的核心难题', challengeTable)}
    ${section('前端工程师怎么看 RPC？', feBox)}
    ${section('常见误区', pitfallBox)}`);
}
