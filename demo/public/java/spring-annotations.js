function renderSpringAnnotations(t) {
  const conclusion = ruleBox('info',
    `<strong>Spring 注解的本质：用"声明"代替"命令"——在类或方法上贴一个标签，框架就知道该做什么。</strong><br><br>
    没有注解的 Java：你写 <code>new OrderService()</code>，手动管理一切。<br>
    有注解的 Spring：你贴 <code>@Service</code>，容器创建；贴 <code>@Autowired</code>，容器注入；贴 <code>@Transactional</code>，代理加事务。<br><br>
    前端类比：像 Vite 配置——你写 <code>plugins: [react()]</code>，剩下的事框架接管；Spring 注解是更细粒度、贴在类/方法上的"插件声明"。`);

  // ── Section 1: 容器注册注解（声明"我是 Bean"）─────────────────────────────────

  const regRows = [
    ['@Component',        '通用组件',          '最基础的注册注解，所有被 Spring 管理的 Bean 都可标这个。其他三个是它的语义化特化版'],
    ['@Service',          '业务逻辑层',        '标识 Service 实现类，语义清晰。功能上等价于 @Component'],
    ['@Repository',       '数据访问层',        '标识 Mapper/DAO，额外把原生数据库异常统一转为 DataAccessException'],
    ['@Controller',       'Web 控制器',        '处理 HTTP 请求，返回视图。前后端分离场景通常用 @RestController 代替'],
    ['@RestController',   'REST 控制器',       '=@Controller + @ResponseBody，方法返回值直接序列化为 JSON'],
    ['@Configuration',    '配置类',            '标识此类含有 @Bean 方法，Spring 会用 CGLIB 代理保证 @Bean 单例'],
    ['@Bean',             '方法级声明',        '在 @Configuration 类的方法上，把返回值注册为 Bean（用于第三方库的类）'],
    ['@ComponentScan',    '包扫描',            '指定扫描的基础包，自动注册带 @Component 系列注解的类。@SpringBootApplication 已内置'],
    ['@Import',           '导入配置类',        '手动导入其他 @Configuration 类，常用于 Starter 拼装'],
    ['@ComponentScan',    '过滤扫描',          '配合 includeFilters/excludeFilters 精确控制扫描范围'],
  ];
  const regTable = compareCard(regRows, ['注解', '用途', '说明']);

  // ── Section 2: 依赖注入（声明"我要用 Bean"）──────────────────────────────────

  const injectCode = `// 三种注入方式对比

// ✅ 构造器注入（推荐）：依赖明确、可测试、可用 final
@Service
@RequiredArgsConstructor  // Lombok 自动生成构造器
public class OrderService {
  private final OrderMapper orderMapper;
  private final NotificationService notificationService;
}

// ⚠️ 字段注入：写法简洁但破坏封装，且无法脱离 Spring 测试
@Service
public class OrderService {
  @Autowired
  private OrderMapper orderMapper;
}

// ⚠️ Setter 注入：可重新注入，但破坏不可变性
@Service
public class OrderService {
  private OrderMapper orderMapper;

  @Autowired
  public void setOrderMapper(OrderMapper orderMapper) {
    this.orderMapper = orderMapper;
  }
}`;

  const injectRows = [
    ['@Autowired',           'Spring 原生',    '按类型注入。若同类型有多个 Bean，配合 @Qualifier 指定名字'],
    ['@Qualifier("name")',   '配合 @Autowired','按 Bean 名字精确指定，解决"同类型多个 Bean"冲突'],
    ['@Resource',            'JSR-250 标准',   '默认按名字注入（name 属性），找不到再按类型。Java 标准注解，跨容器通用'],
    ['@Inject',              'JSR-330 标准',   '与 @Autowired 类似按类型注入，需额外引入 javax.inject 依赖'],
    ['@Primary',             '优先级',         '标在某个 Bean 上，同类型多 Bean 时默认注入它，避免每次都写 @Qualifier'],
    ['@Value("${key}")',     '注入配置值',     '从 application.yml/properties 注入标量值，支持 SpEL 表达式'],
  ];
  const injectTable = compareCard(injectRows, ['注解', '来源', '说明']);

  // ── Section 3: 作用域与生命周期 ──────────────────────────────────────────────

  const scopeRows = [
    ['@Scope("singleton")', '单例（默认）',    '整个容器一个实例，所有注入点共享。Service/Repository 默认用这个'],
    ['@Scope("prototype")', '多例',           '每次注入/获取都新建实例，适合有状态的临时对象'],
    ['@Scope("request")',   'Web 请求级',     '每个 HTTP 请求一个实例，请求结束销毁（需 Web 上下文）'],
    ['@Scope("session")',   'Web 会话级',     '每个 HTTP Session 一个实例'],
    ['@Scope("application")','Web 应用级',    '整个 ServletContext 一个实例'],
    ['@PostConstruct',      '初始化回调',     'Bean 创建并注入完成后执行，做初始化逻辑。JSR-250 标准注解'],
    ['@PreDestroy',         '销毁回调',       'Bean 销毁前执行，做资源释放。仅 singleton 作用域有效'],
    ['@Lazy',               '延迟初始化',     '默认容器启动就创建 Bean，加 @Lazy 改为首次使用时创建'],
    ['@DependsOn("a","b")', '依赖顺序',       '显式指定 Bean 的创建顺序，解决隐式依赖不明显的情况'],
    ['@Order(1)',           '排序',           '给 Bean 排序，用于 List 注入、Filter 链等有序集合场景'],
  ];
  const scopeTable = compareCard(scopeRows, ['注解', '用途', '说明']);

  // ── Section 4: AOP 相关 ─────────────────────────────────────────────────────

  const aopRows = [
    ['@Aspect',              '声明切面',         '标在类上，配合 @Component 注册为 Bean，让 Spring 识别这是切面'],
    ['@Pointcut("expr")',    '定义切点',         '定义"在哪些方法上"织入，可被多个 Advice 复用。方法体通常为空'],
    ['@Before',              '前置通知',         '方法执行前运行，常用于权限校验、参数日志'],
    ['@After',               '后置通知',         '方法执行后运行（无论成功/异常），类似 try-finally'],
    ['@AfterReturning',      '返回通知',         '方法正常返回后运行，可获取返回值做处理'],
    ['@AfterThrowing',       '异常通知',         '方法抛出异常后运行，可获取异常做告警/记录'],
    ['@Around',              '环绕通知',         '最强大，包裹整个方法，可控制是否执行、修改入参/返回值。等价 Koa middleware'],
    ['@DeclareParents',      '引入新接口',       '给目标类动态实现新接口，类似混入（Mixin）'],
    ['@EnableAspectJAutoProxy','开启 AOP',      '配置类上标注，开启 AspectJ 注解支持（Spring Boot 默认已开）'],
  ];
  const aopTable = compareCard(aopRows, ['注解', '用途', '说明']);

  // ── Section 5: 条件装配（Spring Boot 核心）──────────────────────────────────

  const conditionalBox = ruleBox('warning',
    `<strong>条件装配是 Spring Boot 自动配置的基石：</strong>只有当某个条件满足时，对应的 Bean 才会被创建。<br>
    所有 <code>@ConditionalOnXxx</code> 都基于 <code>@Conditional</code> 这个元注解，可自定义实现 <code>Condition</code> 接口。`);

  const conditionalRows = [
    ['@Conditional',                   '基础条件注解',     '元注解，配合自定义 Condition 实现类使用'],
    ['@ConditionalOnClass',            '类路径存在指定类', '最常用：classpath 有对应 jar 才装配。如装了 mysql-connector 才配 DataSource'],
    ['@ConditionalOnMissingClass',     '类路径不存在指定类', '上面取反，较少用'],
    ['@ConditionalOnBean',             '容器中存在指定 Bean', '前置 Bean 已装配才生效'],
    ['@ConditionalOnMissingBean',      '容器中不存在指定 Bean','允许用户覆盖默认配置：用户没自定义才用框架默认'],
    ['@ConditionalOnProperty',         '配置项满足条件',   '功能开关：application.yml 里某 key 存在/等于某值才生效'],
    ['@ConditionalOnResource',         '资源文件存在',     '指定 classpath 资源文件存在才生效'],
    ['@ConditionalOnWebApplication',   '是 Web 应用',      '当前是 Servlet Web 环境才生效'],
    ['@ConditionalOnNotWebApplication','非 Web 应用',      '上面取反'],
    ['@ConditionalOnExpression',       'SpEL 表达式为真', `复杂条件判断，如 <code>#{systemProperties['os.name'] == 'Linux'}</code>`],
    ['@Profile("dev")',                '环境 Profile',    '指定 Profile 激活时才装配，常用于多环境配置'],
  ];
  const conditionalTable = compareCard(conditionalRows, ['注解', '条件', '说明']);

  // ── Section 6: Web/MVC 注解 ────────────────────────────────────────────────

  const webRows = [
    ['@RequestMapping',     '通用映射',         '映射 URL 到方法。可指定 method/path/params 等。通常用下面的特化版'],
    ['@GetMapping',         'GET 请求',         '查询接口。等价 @RequestMapping(method = GET)'],
    ['@PostMapping',        'POST 请求',        '创建资源。等价 @RequestMapping(method = POST)'],
    ['@PutMapping',         'PUT 请求',         '整体更新资源（幂等）'],
    ['@PatchMapping',       'PATCH 请求',       '部分更新资源'],
    ['@DeleteMapping',      'DELETE 请求',      '删除资源'],
    ['@RequestParam',       '查询参数',         '绑定 URL ?key=value 形式的参数，支持默认值和必填校验'],
    ['@PathVariable',       '路径变量',         '绑定 URL 模板中的 {id} 变量，如 GET /users/{id}'],
    ['@RequestBody',        '请求体',           '把请求体 JSON 反序列化为对象，POST/PUT 常用'],
    ['@ResponseBody',       '响应体',           '方法返回值直接序列化为响应体。@RestController 已内置'],
    ['@ResponseStatus',     '响应状态码',       '指定方法返回的 HTTP 状态码，如 @ResponseStatus(HttpStatus.CREATED)'],
    ['@RequestHeader',      '请求头',           '绑定 HTTP 请求头到方法参数'],
    ['@CookieValue',        'Cookie 值',        '绑定 Cookie 到方法参数'],
    ['@ModelAttribute',     '模型属性',         '绑定表单字段到对象，或方法返回值放入 Model'],
    ['@SessionAttribute',   '会话属性',         '从 HTTP Session 取属性'],
    ['@RequestAttribute',   '请求属性',         '从 HttpServletRequest 取属性（Filter/Interceptor 设的）'],
    ['@ExceptionHandler',   '异常处理',         '处理 Controller 抛出的指定异常，返回错误响应'],
    ['@ControllerAdvice',   '全局 Controller 增强','给所有 Controller 应用 @ExceptionHandler / @ModelAttribute / @InitBinder'],
    ['@RestControllerAdvice','全局 REST 增强',  '=@ControllerAdvice + @ResponseBody，专门处理 JSON 错误响应'],
    ['@CrossOrigin',        '跨域',             '允许跨域请求，可标在方法或类上。也可用全局 WebMvcConfigurer 配置'],
  ];
  const webTable = compareCard(webRows, ['注解', '用途', '说明']);

  // ── Section 7: 配置绑定 ────────────────────────────────────────────────────

  const configCode = `// application.yml
app:
  jwt:
    secret: my-secret
    expiration: 86400

// 把 yml 配置绑定到 Java 类
@Component
@ConfigurationProperties(prefix = "app.jwt")  // 绑定 app.jwt 前缀
public class JwtProperties {
  private String secret;
  private int expiration;
  // Getter / Setter（或 Lombok @Data）
}

// 使用 @Value 也可注入单个值（适合简单场景）
@Value("\${app.jwt.secret}")
private String jwtSecret;`;

  const configRows = [
    ['@ConfigurationProperties',  '批量绑定配置',  '把 yml 中某前缀下所有配置绑定到 Java 类字段，类型安全'],
    ['@EnableConfigurationProperties','启用绑定', '在 @Configuration 类上声明要绑定的 Properties 类'],
    ['@ConfigurationPropertiesScan',  '扫描绑定', '自动扫描带 @ConfigurationProperties 的类，无需逐个 @Enable'],
    ['@Value("${key}")',           '单值注入',   '注入单个配置值，支持 SpEL。简单场景用，复杂配置用上面那个'],
    ['@PropertySource',            '指定配置文件','加载额外的 .properties 文件（不支持 yml），常用于自定义配置'],
    ['@PropertySources',           '多个配置文件','@PropertySource 的容器注解，可指定多个'],
    ['@Profile("dev")',            '环境隔离',   '指定 Bean/配置在哪个 Profile 激活时生效，配合 spring.profiles.active'],
  ];
  const configTable = compareCard(configRows, ['注解', '用途', '说明']);

  // ── Section 8: 事务、缓存、校验 ─────────────────────────────────────────────

  const txRows = [
    ['@Transactional',            '声明式事务',  '最常用：标在方法/类上，Spring 用 AOP 代理自动 begin/commit/rollback'],
    ['@EnableTransactionManagement','开启事务',  '配置类上标注，开启注解事务支持（Spring Boot 默认已开）'],
    ['@Cacheable',                '缓存查询',    '方法执行前先查缓存，命中直接返回；未命中执行方法并把结果存缓存'],
    ['@CachePut',                 '更新缓存',    '方法一定执行，把返回值更新到缓存（写场景用，如更新后刷新缓存）'],
    ['@CacheEvict',               '清除缓存',    '方法执行后清除指定 key 或全部缓存（删除场景用）'],
    ['@Caching',                  '组合缓存操作', '一个方法上组合多个 @Cacheable/@CachePut/@CacheEvict'],
    ['@CacheConfig',              '缓存公共配置', '类级别声明本类所有缓存方法共用的 cacheNames/keyGenerator 等'],
    ['@EnableCaching',            '开启缓存',    '配置类上标注，开启注解缓存支持'],
    ['@Valid',                    'JSR-303 校验', '级联校验对象内部属性，常用于嵌套对象校验'],
    ['@Validated',                'Spring 扩展',  '支持分组校验，比 @Valid 多了 groups 功能'],
  ];
  const txTable = compareCard(txRows, ['注解', '用途', '说明']);

  // ── Section 9: 调度与异步 ──────────────────────────────────────────────────

  const scheduleCode = `// 开启调度支持
@EnableScheduling
@SpringBootApplication
public class App { ... }

// 定时任务：每 5 秒执行一次
@Component
public class ReportTask {

  @Scheduled(fixedRate = 5000)  // 每 5 秒一次（不等待上次完成）
  public void generateReport() { ... }

  @Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨 2 点
  public void dailyReport() { ... }
}

// 异步方法：调用后立即返回，实际在线程池执行
@Service
public class EmailService {

  @Async
  public void sendAsync(String to) { ... }  // 调用方不阻塞
}`;

  const scheduleRows = [
    ['@EnableScheduling', '开启调度',     '配置类上标注，开启 @Scheduled 支持'],
    ['@Scheduled',        '定时任务',     'fixedRate/fixedDelay/cron 三种模式，标在方法上自动调度'],
    ['@EnableAsync',      '开启异步',     '配置类上标注，开启 @Async 支持'],
    ['@Async',            '异步执行',     '方法调用后立即返回，实际在独立线程池执行。注意：同类内部调用会失效（AOP 限制）'],
    ['@Async("executor")','指定线程池',   '使用指定的 ThreadPoolTaskExecutor 执行'],
  ];
  const scheduleTable = compareCard(scheduleRows, ['注解', '用途', '说明']);

  // ── Section 10: Spring Boot 启动相关 ───────────────────────────────────────

  const bootRows = [
    ['@SpringBootApplication', '启动类总注解', '=@SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan 三合一'],
    ['@SpringBootConfiguration', '配置类',     '本质就是 @Configuration，标识启动类本身也是配置类'],
    ['@EnableAutoConfiguration','自动配置开关', '触发 Spring Boot 扫描 AutoConfiguration.imports 加载自动配置类'],
    ['@MapperScan',            'MyBatis 扫描', '指定 Mapper 接口所在包，自动注册为 Bean（替代 @Mapper 逐个标）'],
    ['@EnableFeignClients',    'Feign 客户端', 'Spring Cloud：扫描 @FeignClient 接口，生成 HTTP 客户端代理'],
    ['@EnableDiscoveryClient', '服务发现',     'Spring Cloud：注册到注册中心（Nacos/Eureka）'],
    ['@EnableEurekaClient',    'Eureka 客户端', 'Eureka 专用，等价 @EnableDiscoveryClient'],
  ];
  const bootTable = compareCard(bootRows, ['注解', '用途', '说明']);

  // ── Section 11: 测试注解 ───────────────────────────────────────────────────

  const testRows = [
    ['@SpringBootTest',      '集成测试',       '启动完整 Spring 上下文，可注入任何 Bean 做端到端测试'],
    ['@WebMvcTest',          '切片测试-Web',   '只启动 MVC 层（Controller + Mock），不加载 Service/Repository'],
    ['@DataJpaTest',         '切片测试-JPA',   '只启动 JPA 层，自动配置内嵌数据库，每个测试后回滚'],
    ['@MybatisTest',         '切片测试-MyBatis','只启动 MyBatis 层，配合内嵌库做 Mapper 测试'],
    ['@MockBean',            'Mock 替换',      '在 Spring 上下文中用 Mockito Mock 替换指定 Bean'],
    ['@SpyBean',             'Spy 包装',       '对真实 Bean 做 Spy，可 stub 部分方法，其余走真实逻辑'],
    ['@ActiveProfiles("test")','指定 Profile', '测试时激活指定 Profile，加载对应配置文件'],
    ['@TestPropertySource',  '测试属性',       '指定测试专用的 properties 文件或键值对'],
    ['@DirtiesContext',      '脏上下文',       '测试后重建 Spring 上下文，慎用（昂贵）'],
    ['@Transactional',       '测试事务',       '测试方法默认自动回滚，不污染数据库'],
  ];
  const testTable = compareCard(testRows, ['注解', '用途', '说明']);

  // ── Section 12: Spring Cloud / 微服务 ──────────────────────────────────────

  const cloudRows = [
    ['@FeignClient("user-service")','声明式 HTTP 客户端','像调本地方法一样调远程服务，Spring Cloud 自动生成实现'],
    ['@RefreshScope',              '配置热刷新',     'Nacos 配置变更后，标此注解的 Bean 会在下次访问时重建'],
    ['@LoadBalanced',              '负载均衡',       '给 RestTemplate/ WebClient 加 Ribbon/LoadBalancer 能力'],
    ['@EnableCircuitBreaker',      '熔断器开关',     '开启熔断降级支持（Hystrix/Resilience4j）'],
    ['@HystrixCommand',            'Hystrix 熔断',   '声明方法降级逻辑，配置 fallbackMethod'],
    ['@SentinelResource',          'Sentinel 限流',  'Alibaba Sentinel：限流、熔断、热点参数控制'],
    ['@EnableZuulProxy',           'Zuul 网关',      'Spring Cloud Zuul 网关代理（旧版，推荐用 Gateway）'],
    ['@SpringCloudApplication',    'Cloud 应用总注解','=@SpringBootApplication + @EnableDiscoveryClient + @EnableCircuitBreaker'],
    ['@NacosConfigListener',       'Nacos 配置监听', '监听 Nacos 配置变更，自动注入新值'],
  ];
  const cloudTable = compareCard(cloudRows, ['注解', '用途', '说明']);

  // ── Section 13: Spring Security ────────────────────────────────────────────

  const securityRows = [
    ['@EnableWebSecurity',          '开启 Web 安全', '配置类上标注，开启 Spring Security 默认配置'],
    ['@EnableGlobalMethodSecurity', '方法级安全',    '开启 @PreAuthorize / @Secured 等方法级注解支持'],
    ['@PreAuthorize("hasRole(\'A\')")','方法前鉴权',  '方法执行前校验权限，支持 SpEL，最常用'],
    ['@PostAuthorize',              '方法后鉴权',    '方法执行后校验（如校验返回值的归属），用得较少'],
    ['@Secured("ROLE_ADMIN")',      '角色校验',      'JSR-250 注解，仅支持角色，不如 @PreAuthorize 灵活'],
    ['@RolesAllowed("ADMIN")',      'JSR-250 标准',  '标准注解，与 @Secured 等价，需在 @EnableGlobalMethodSecurity 开启 jsr250Enabled'],
    ['@EnableOAuth2Client',         'OAuth2 客户端', '开启 OAuth2 客户端支持'],
    ['@EnableResourceServer',       '资源服务器',    '标识当前服务是 OAuth2 资源服务器，校验 access_token'],
    ['@EnableAuthorizationServer',  '授权服务器',    '标识当前服务是 OAuth2 授权服务器（Spring Security OAuth2 旧版）'],
  ];
  const securityTable = compareCard(securityRows, ['注解', '用途', '说明']);

  // ── Section 14: 前端类比速查 ───────────────────────────────────────────────

  const feRows = [
    ['export class + 注册到组件树', '@Component / @Service', '声明"这是一个被框架管理的单元"'],
    ['useContext(Context)',         '@Autowired',             '从框架容器中取用已注册的实例'],
    ['defineConfig({ plugins })',   '@SpringBootApplication', '声明式配置入口，框架接管剩下的事'],
    ['middleware / HOC',            '@Around / @Aspect',      '不修改原始代码，包裹增强逻辑'],
    ['if (import.meta.env.X)',      '@ConditionalOnProperty', '基于条件决定是否启用某能力'],
    ['vite.config.ts 覆盖默认',     '@ConditionalOnMissingBean','用户自定义优先，框架兜底'],
    ['useSWR(key, fetcher)',        '@Cacheable',             '命中缓存直接返回，否则执行并缓存'],
    ['useEffect(() => {...}, [])',  '@PostConstruct',         '初始化完成后的回调'],
    ['express.Router().get(path)',  '@GetMapping',            '声明式路由与 HTTP 方法映射'],
  ];
  const feTable = compareCard(feRows, ['前端', 'Spring 注解', '本质类比']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('容器注册注解（声明"我是 Bean"）', regTable)}
    ${section('依赖注入（声明"我要用 Bean"）', codeBlock('三种注入方式对比', 'dot-orange', 'java', injectCode) + injectTable)}
    ${section('作用域与生命周期', scopeTable)}
    ${section('AOP 相关注解', aopTable)}
    ${section('条件装配（Spring Boot 核心）', conditionalBox + conditionalTable)}
    ${section('Web / MVC 注解', webTable)}
    ${section('配置绑定', codeBlock('配置绑定示例', 'dot-blue', 'java', configCode) + configTable)}
    ${section('事务、缓存、校验', txTable)}
    ${section('调度与异步', codeBlock('@Scheduled / @Async 示例', 'dot-orange', 'java', scheduleCode) + scheduleTable)}
    ${section('Spring Boot 启动相关', bootTable)}
    ${section('测试注解', testTable)}
    ${section('Spring Cloud / 微服务', cloudTable)}
    ${section('Spring Security', securityTable)}
    ${section('前端类比速查', feTable)}`);
}
