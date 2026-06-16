function renderSpringBeanIoc(t) {
  const conclusion = ruleBox('info',
    `<strong>IoC（控制反转）= 对象不再由你 <code>new</code>，而是由 Spring 容器创建并管理。</strong><br><br>
    你只需要告诉 Spring "这个类是 Bean"（加注解），然后在需要它的地方声明"我要用它"（@Autowired）。<br>
    容器负责创建、配置、注入——这就是"控制权反转给框架"的含义。<br><br>
    前端类比：类似 React 的 Context——组件不直接 <code>new Service()</code>，而是从 Context 中取用已有的实例。`);

  // ── Section 1: 没有 IoC vs 有 IoC ──────────────────────────────────────────

  const noIocCode = `// ❌ 传统方式：手动 new，强耦合
public class OrderController {

  // 直接 new，OrderController 和 OrderService 紧耦合
  private OrderService orderService = new OrderService(
    new OrderMapper(),          // OrderService 依赖 OrderMapper
    new NotificationService()   // OrderService 依赖 NotificationService
  );

  // 问题：
  // 1. 依赖关系在每个用到的地方都要手写
  // 2. 测试时无法替换为 Mock 实现
  // 3. OrderService 的依赖变了，所有 new 的地方都要改
}`;

  const withIocCode = `// ✅ Spring IoC：声明依赖，容器注入
@RestController
public class OrderController {

  @Autowired  // Spring 自动注入已有的 OrderService 实例
  private OrderService orderService;

  // OrderService 怎么创建的、依赖了什么——OrderController 完全不关心
  // 测试时只需注入 Mock 版 OrderService
}

@Service  // 告诉 Spring：这个类是一个 Bean，请管理它
public class OrderService {

  @Autowired
  private OrderMapper orderMapper;

  @Autowired
  private NotificationService notificationService;
}`;

  const iocPair = codeBlocksRow([
    codeBlock('手动 new——强耦合', 'dot-red', 'java', noIocCode),
    codeBlock('Spring IoC——松耦合', 'dot-green', 'java', withIocCode),
  ]);

  // ── Section 2: 四个注册注解 ───────────────────────────────────────────────────

  const annotationRows = [
    ['@Component',    '通用组件',    '不属于特定层的工具类、配置类，其他三个都是它的特化版'],
    ['@Service',      '业务逻辑层',  '放 Service 实现类，标识"这里是业务逻辑"，语义更清晰'],
    ['@Repository',   '数据访问层',  '放 Mapper/DAO 实现类，Spring 会自动把数据库异常转换为统一的 DataAccessException'],
    ['@Controller',   'Web 层',     '处理 HTTP 请求，与 @ResponseBody 合用时常简写为 @RestController'],
  ];
  const annotationTable = compareCard(annotationRows, ['注解', '语义层']);

  // ── Section 3: 三种注入方式 ───────────────────────────────────────────────────

  const fieldInjectCode = `// 方式一：字段注入（Field Injection）
// 写法最简洁，但不推荐用于生产——无法在不启动 Spring 的情况下写单元测试
@Service
public class OrderService {

  @Autowired
  private OrderMapper orderMapper;

  @Autowired
  private NotificationService notificationService;
}`;

  const constructorInjectCode = `// 方式二：构造器注入（Constructor Injection）✅ 推荐
// 依赖关系明确，强制在创建时注入，便于单元测试（直接 new 传入 mock）
// Lombok @RequiredArgsConstructor 可以省略手写构造器
@Service
@RequiredArgsConstructor  // Lombok：自动生成包含 final 字段的构造器
public class OrderService {

  private final OrderMapper orderMapper;           // final 字段
  private final NotificationService notificationService;

  // 等价于手写：
  // public OrderService(OrderMapper orderMapper,
  //                     NotificationService notificationService) {
  //   this.orderMapper = orderMapper;
  //   this.notificationService = notificationService;
  // }
}

// 单元测试时直接 new，不需要启动 Spring：
// OrderService service = new OrderService(mockMapper, mockNotification);`;

  const injectPair = codeBlocksRow([
    codeBlock('字段注入（简洁但不推荐）', 'dot-yellow', 'java', fieldInjectCode),
    codeBlock('构造器注入（推荐）', 'dot-green', 'java', constructorInjectCode),
  ]);

  // ── Section 4: Bean 作用域 ────────────────────────────────────────────────────

  const scopeRows = [
    ['singleton', '单例（默认）', '整个容器只有一个实例，所有注入点共享同一对象。Service / Repository 都用这个'],
    ['prototype', '多例',        '每次注入 / 每次 getBean() 都创建新实例。适合有状态的临时对象（很少用）'],
    ['request',   '请求级',      '每个 HTTP 请求创建一个实例，请求结束销毁。需要 @Scope("request")'],
    ['session',   '会话级',      '每个 HTTP Session 创建一个实例。需要 @Scope("session")'],
  ];
  const scopeTable = compareCard(scopeRows, ['作用域', '生命周期']);

  const scopeNote = ruleBox('warning',
    `<strong>99% 的场景用默认的 singleton。</strong> singleton Bean 本身<strong>必须是无状态的</strong>（不能有实例变量存储请求数据），
    否则多线程并发访问同一实例会出现数据污染。<br>
    判断标准：如果你的 Service 方法所有数据都来自参数和数据库，没有 <code>this.xxx = ...</code> 的赋值操作，就是安全的单例。`);

  // ── Section 5: 前端类比 ───────────────────────────────────────────────────────

  const feCompare = `// 前端：React Context 手动实现依赖注入
const ServiceContext = createContext(null);

// 注册服务（类比 @Service）
const orderService = new OrderService();

// 提供给子树（类比 Spring 容器）
function App() {
  return (
    <ServiceContext.Provider value={{ orderService }}>
      <OrderPage />
    </ServiceContext.Provider>
  );
}

// 消费（类比 @Autowired）
function OrderPage() {
  const { orderService } = useContext(ServiceContext); // 不自己 new
  // ...
}`;

  const javaCompare = `// Java：Spring IoC 自动完成上面所有事
@Service  // 注册到容器（类比 createContext + new + Provider）
public class OrderService { ... }

@RestController
public class OrderController {
  @Autowired  // 从容器取用（类比 useContext）
  private OrderService orderService;
  // Spring 自动注入，不需要手动传递
}

// 区别：
// React Context 需要手动创建、手动提供、手动消费
// Spring IoC 只需要加注解，框架自动扫描、自动注入
// 而且 Spring 还管理 Bean 的生命周期（创建顺序、销毁回调等）`;

  const feJavaPair = codeBlocksRow([
    codeBlock('前端：React Context 模拟 IoC', 'dot-blue', 'typescript', feCompare),
    codeBlock('Java：Spring IoC 自动注入', 'dot-orange', 'java', javaCompare),
  ]);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('没有 IoC vs 有 IoC', iocPair)}
    ${section('四个注册注解的区别', annotationTable)}
    ${section('三种注入方式', injectPair)}
    ${section('Bean 的作用域（Scope）', scopeTable + scopeNote)}
    ${section('前端类比：React Context vs Spring IoC', feJavaPair)}`);
}
