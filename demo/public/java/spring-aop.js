function renderSpringAop(t) {
  const conclusion = ruleBox('info',
    `<strong>AOP（面向切面编程）= 不修改业务代码，给方法"织入"前后逻辑。</strong><br><br>
    日志、事务、权限校验、耗时统计——这些逻辑横跨所有业务方法，不该散落在每个 Service 里。<br>
    Spring AOP 通过<strong>动态代理</strong>实现：调用方拿到的不是真实对象，而是代理对象，代理在调用真实方法前后插入切面逻辑。<br><br>
    前端类比：Express/Koa 的 <strong>middleware</strong>，或 React 的 <strong>HOC（高阶组件）</strong>——包装原始函数，不修改它。`);

  // ── Section 1: 代理机制 ───────────────────────────────────────────────────────

  const proxyBox = ruleBox('warning',
    `<strong>Spring AOP 的两种代理方式：</strong><br><br>
    • <strong>JDK 动态代理</strong>：目标类实现了接口时使用。代理对象实现同一接口，通过 <code>InvocationHandler</code> 拦截调用。<br>
    • <strong>CGLIB 代理</strong>：目标类没有接口时使用。通过生成目标类的<strong>子类</strong>来拦截方法调用。<br><br>
    这就是为什么 <code>@Transactional</code> 在同类 <code>this.method()</code> 调用时失效——<code>this</code> 指向真实对象，绕过了代理。`);

  const proxyConceptCode = `// Spring AOP 代理的本质（伪代码）

// 你写的真实 Service
public class OrderService {
  public void createOrder(Order order) {
    orderMapper.insert(order);
  }
}

// Spring 在运行时动态生成的代理类（大致等价）
public class OrderService$$SpringProxy extends OrderService {

  @Override
  public void createOrder(Order order) {
    // ← @Transactional 切面：开启事务
    TransactionManager.begin();
    try {
      super.createOrder(order);  // 调用真实方法
      TransactionManager.commit();
    } catch (RuntimeException e) {
      TransactionManager.rollback();
      throw e;
    }
    // → @Transactional 切面：提交/回滚事务
  }
}

// 你注入的 orderService 实际上是代理对象，不是真实对象
// 所以 this.createOrder() 直接调用真实对象，事务切面不介入`;

  // ── Section 2: 核心概念 ────────────────────────────────────────────────────────

  const conceptRows = [
    ['Aspect（切面）',      '@Aspect 类',                 '切面逻辑的载体，把"在哪切"和"切什么"组合在一起'],
    ['Pointcut（切点）',    '@Pointcut 表达式',            '定义"在哪些方法上"织入，用 AspectJ 表达式描述'],
    ['JoinPoint（连接点）', '方法执行时的上下文对象',       '在 Advice 方法参数中接收，可获取方法名、参数等信息'],
    ['Advice（通知）',      '@Before / @After / @Around', '定义"织入什么逻辑"，以及在方法的哪个时机执行'],
    ['Weaving（织入）',     '运行时动态代理',              'Spring AOP 在运行时织入，AspectJ 可在编译期织入'],
  ];
  const conceptTable = compareCard(conceptRows, ['概念', '对应实现']);

  // ── Section 3: 五种 Advice 类型 ───────────────────────────────────────────────

  const adviceRows = [
    ['@Before',          '方法执行前',       '权限校验、参数日志。不能阻止方法执行（除非抛异常）'],
    ['@After',           '方法执行后（finally）', '无论正常还是异常都会执行，类似 try-finally'],
    ['@AfterReturning',  '方法正常返回后',   '可拿到返回值，做结果日志或结果处理'],
    ['@AfterThrowing',   '方法抛出异常后',   '可拿到异常对象，做异常告警或错误日志'],
    ['@Around',          '包裹整个方法',     '最强大，可控制是否执行原方法、修改入参/返回值。等价于 Koa middleware'],
  ];
  const adviceTable = compareCard(adviceRows, ['Advice 类型', '执行时机']);

  // ── Section 4: 完整示例——接口耗时统计 ────────────────────────────────────────

  const loggingAspect = `import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;

@Aspect      // 声明这是一个切面
@Component   // 让 Spring 管理这个 Bean
public class TimingAspect {

  // 切点：匹配 com.example 包下所有 Service 类的所有 public 方法
  @Pointcut("execution(public * com.example..*Service.*(..))")
  private void serviceLayer() {}

  // @Around：最常用，可以计时、记录入参/出参
  @Around("serviceLayer()")
  public Object logTiming(ProceedingJoinPoint pjp) throws Throwable {
    String method = pjp.getSignature().toShortString();
    long start = System.currentTimeMillis();

    try {
      Object result = pjp.proceed(); // 调用真实方法
      long elapsed = System.currentTimeMillis() - start;
      log.info("[{}] 耗时 {}ms", method, elapsed);
      return result;
    } catch (Throwable e) {
      long elapsed = System.currentTimeMillis() - start;
      log.error("[{}] 异常 耗时 {}ms: {}", method, elapsed, e.getMessage());
      throw e; // 重新抛出，不吞异常
    }
  }
}`;

  // ── Section 5: @Before / @After 示例 ─────────────────────────────────────────

  const beforeAfterCode = `@Aspect
@Component
public class AuthAspect {

  // @Before：方法执行前做权限校验
  @Before("@annotation(com.example.annotation.RequireAdmin)")
  public void checkAdminRole(JoinPoint jp) {
    String currentRole = SecurityContext.getCurrentRole();
    if (!"ADMIN".equals(currentRole)) {
      throw new UnauthorizedException("需要管理员权限");
    }
    // 不抛异常则继续执行原方法
  }

  // @AfterReturning：拿到返回值，脱敏日志
  @AfterReturning(
    pointcut = "execution(* com.example.*Service.getUser(..))",
    returning = "result"  // 绑定返回值到 result 参数
  )
  public void maskSensitiveData(Object result) {
    if (result instanceof UserDTO user) {
      log.info("查询用户：id={}, phone={}",
        user.getId(), maskPhone(user.getPhone())); // 手机号脱敏
    }
  }
}`;

  const twoAspectPair = codeBlocksRow([
    codeBlock('完整示例：@Around 计时切面', 'dot-orange', 'java', loggingAspect),
    codeBlock('@Before 权限 / @AfterReturning 日志', 'dot-blue', 'java', beforeAfterCode),
  ]);

  // ── Section 6: 前端类比 ───────────────────────────────────────────────────────

  const koaMiddleware = `// Koa middleware ≈ @Around Advice
app.use(async (ctx, next) => {
  const start = Date.now();
  // ← @Before 逻辑：记录开始时间

  await next(); // ← pjp.proceed()：调用下一个处理器

  const elapsed = Date.now() - start;
  // → @AfterReturning 逻辑：记录耗时
  console.log(\`\${ctx.method} \${ctx.url} - \${elapsed}ms\`);
});

// React HOC ≈ @Around（组件维度）
function withLogging(WrappedComponent) {
  return function LoggedComponent(props) {
    useEffect(() => {
      console.log('组件挂载:', WrappedComponent.name);
      return () => console.log('组件卸载');
    }, []);
    return <WrappedComponent {...props} />;
  };
}`;

  const springAopCompare = `// Spring @Around ≈ Koa middleware
@Around("execution(* com.example..*Controller.*(..))")
public Object logRequest(ProceedingJoinPoint pjp) throws Throwable {
  // ← 前置逻辑（Koa 的 await next() 之前）
  log.info("请求开始: {}", pjp.getSignature());

  Object result = pjp.proceed(); // ← next()：调用真实 Controller 方法

  // → 后置逻辑（Koa 的 await next() 之后）
  log.info("请求结束");
  return result;
}

// 差异：
// Koa middleware 是函数链，手动 next()
// Spring AOP 是代理模式，pjp.proceed() 调用真实方法
// 两者都是"包裹原始逻辑"的思路，不修改原始代码`;

  const fePair = codeBlocksRow([
    codeBlock('前端：Koa middleware / React HOC', 'dot-blue', 'typescript', koaMiddleware),
    codeBlock('Java：Spring @Around', 'dot-orange', 'java', springAopCompare),
  ]);

  // ── Section 7: 使用场景 ───────────────────────────────────────────────────────

  const usageRows = [
    ['接口耗时统计',    '@Around',         '记录每个 Service 方法的执行时间'],
    ['操作日志',        '@AfterReturning', '方法成功后记录"谁在什么时间做了什么"'],
    ['权限校验',        '@Before',         '方法执行前检查当前用户是否有权限'],
    ['异常告警',        '@AfterThrowing',  '捕获异常后发钉钉/邮件告警'],
    ['事务管理',        '@Around（内置）', '@Transactional 底层就是一个 @Around 切面'],
    ['缓存',           '@Around（内置）', '@Cacheable 底层也是 AOP，先查缓存再调方法'],
  ];
  const usageTable = compareCard(usageRows, ['使用场景', 'Advice 类型']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('Spring AOP 的代理机制', proxyBox + codeBlock('动态代理伪代码', 'dot-blue', 'java', proxyConceptCode))}
    ${section('核心概念速查', conceptTable)}
    ${section('五种 Advice 类型', adviceTable)}
    ${section('完整代码示例', twoAspectPair)}
    ${section('前端类比：Koa middleware vs Spring AOP', fePair)}
    ${section('AOP 常见使用场景', usageTable)}`);
}
