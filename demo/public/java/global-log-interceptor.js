function renderGlobalLogInterceptor(t) {
  const conclusion = ruleBox('info',
    `<strong>全局日志拦截 = 不修改业务代码，在统一入口记录请求/响应/异常。</strong><br><br>
    Spring 提供三层拦截点：<strong>Filter（Servlet 层）→ HandlerInterceptor（MVC 层）→ AOP Aspect（Service 层）</strong>，各有侧重。<br>
    配合 <strong>MDC（Mapped Diagnostic Context）</strong>注入 traceId，可实现跨方法、跨线程的链路追踪。<br><br>
    前端类比：<strong>axios 拦截器</strong>（请求/响应统一处理）+ <strong>Sentry 全局错误捕获</strong>（异常上报）。`);

  // ── Section 1: 三层拦截对比 ───────────────────────────────────────────────────

  const layerRows = [
    ['axios 请求拦截器',      'Filter',              '最外层，Servlet 层。可读写 Request/Response 原始字节，适合注入 traceId、鉴权'],
    ['axios 响应拦截器',      'HandlerInterceptor',  'MVC 层。preHandle/postHandle/afterCompletion，可拿到 HandlerMethod（Controller 方法信息）'],
    ['HOC / Redux middleware', '@Aspect',             'Service/方法层。AOP 切面，粒度最细，可拦截任意 Bean 的方法入参和返回值'],
    ['Sentry 全局捕获',        '@ControllerAdvice',  '全局异常处理。统一捕获 Controller 层异常，返回标准错误结构'],
  ];
  const layerTable = compareCard(layerRows, ['前端类比', 'Java 实现']);

  // ── Section 2: MDC 链路追踪 ───────────────────────────────────────────────────

  const mdcBox = ruleBox('warning',
    `<strong>MDC（Mapped Diagnostic Context）</strong>：Logback/Log4j2 提供的线程本地 Map，用于在日志中自动附加键值对。<br><br>
    在 Filter 中注入 <code>MDC.put("traceId", uuid)</code>，该线程后续的所有 <code>log.info()</code> 输出都会自动带上 traceId，无需手动传参。<br><br>
    <strong>注意</strong>：MDC 是 ThreadLocal，使用异步（<code>@Async</code> / 线程池）时需手动传递或使用 <code>MDC.getCopyOfContextMap()</code>。`);

  const mdcFilterCode = `import org.slf4j.MDC;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.UUID;

@Component
public class TraceIdFilter implements Filter {

  private static final String TRACE_ID = "traceId";

  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {

    HttpServletRequest request = (HttpServletRequest) req;

    // 优先取上游传入的 traceId（微服务链路透传），否则生成新的
    String traceId = request.getHeader("X-Trace-Id");
    if (traceId == null || traceId.isBlank()) {
      traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    MDC.put(TRACE_ID, traceId);
    // 将 traceId 回写到响应头，方便前端排查
    ((HttpServletResponse) res).setHeader("X-Trace-Id", traceId);

    try {
      chain.doFilter(req, res);  // 继续执行后续 Filter / Controller
    } finally {
      MDC.remove(TRACE_ID);     // 必须清除，防止线程池复用时污染下一个请求
    }
  }
}`;

  const logbackPatternCode = `<!-- logback-spring.xml：在日志格式中引用 MDC 变量 -->
<pattern>
  %d{HH:mm:ss.SSS} [%thread] %-5level [%X{traceId}] %logger{36} - %msg%n
</pattern>

<!-- 输出示例：
13:42:01.234 [http-nio-8080-exec-1] INFO  [a3f9b2c1d4e5f6a7] c.e.service.OrderService - 创建订单: orderId=1001
13:42:01.891 [http-nio-8080-exec-1] INFO  [a3f9b2c1d4e5f6a7] c.e.service.PayService   - 支付完成: orderId=1001
-->`;

  const mdcPair = codeBlocksRow([
    codeBlock('TraceIdFilter.java — 注入 traceId 到 MDC', 'dot-orange', 'java', mdcFilterCode),
    codeBlock('logback-spring.xml — 日志格式引用 MDC', 'dot-green', 'xml', logbackPatternCode),
  ]);

  // ── Section 3: AOP 统一接口日志 ───────────────────────────────────────────────

  const aopLogCode = `import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;

@Aspect
@Component
public class ApiLogAspect {

  private final ObjectMapper mapper = new ObjectMapper();

  // 切点：拦截所有 Controller 方法
  @Pointcut("execution(* com.example..*Controller.*(..))")
  private void controllerLayer() {}

  @Around("controllerLayer()")
  public Object logApiCall(ProceedingJoinPoint pjp) throws Throwable {
    String method = pjp.getSignature().toShortString();

    // 记录入参（注意：不要打印敏感字段，如密码）
    String args = mapper.writeValueAsString(pjp.getArgs());
    log.info("→ 请求: {} args={}", method, args);

    long start = System.currentTimeMillis();
    try {
      Object result = pjp.proceed();
      long elapsed = System.currentTimeMillis() - start;
      log.info("← 响应: {} 耗时={}ms result={}", method, elapsed,
        mapper.writeValueAsString(result));
      return result;
    } catch (Throwable e) {
      long elapsed = System.currentTimeMillis() - start;
      log.error("✗ 异常: {} 耗时={}ms error={}", method, elapsed, e.getMessage());
      throw e;
    }
  }
}`;

  // ── Section 4: HandlerInterceptor ─────────────────────────────────────────────

  const interceptorCode = `import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.method.HandlerMethod;
import jakarta.servlet.http.*;

@Component
public class RequestLogInterceptor implements HandlerInterceptor {

  // preHandle：Controller 执行前。返回 false 则中断请求
  @Override
  public boolean preHandle(HttpServletRequest req,
                           HttpServletResponse res, Object handler) {
    if (handler instanceof HandlerMethod hm) {
      // 可拿到注解：@LoginRequired、@Permission 等
      boolean requireLogin = hm.hasMethodAnnotation(LoginRequired.class);
      log.info("请求: {} {} requireLogin={}", req.getMethod(), req.getRequestURI(), requireLogin);
    }
    return true; // true = 继续执行，false = 拦截
  }

  // afterCompletion：渲染完成后（包括异常情况）
  @Override
  public void afterCompletion(HttpServletRequest req,
                              HttpServletResponse res,
                              Object handler, Exception ex) {
    if (ex != null) {
      log.error("请求异常: {} {}", req.getMethod(), req.getRequestURI(), ex);
    }
  }
}

// 注册拦截器
@Configuration
public class WebConfig implements WebMvcConfigurer {
  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(requestLogInterceptor)
            .addPathPatterns("/api/**")   // 只拦截 /api/** 路径
            .excludePathPatterns("/api/health"); // 排除健康检查
  }
}`;

  const aopInterceptorPair = codeBlocksRow([
    codeBlock('AOP @Around — Service 层接口日志', 'dot-orange', 'java', aopLogCode),
    codeBlock('HandlerInterceptor — MVC 层请求日志', 'dot-blue', 'java', interceptorCode),
  ]);

  // ── Section 5: 全局异常处理 ───────────────────────────────────────────────────

  const globalExceptionCode = `import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;

// @ControllerAdvice = 全局 AOP，专门处理 Controller 层抛出的异常
@RestControllerAdvice
public class GlobalExceptionHandler {

  // 业务异常：已知的、可预期的错误（余额不足、商品不存在等）
  @ExceptionHandler(BusinessException.class)
  public Result<Void> handleBusiness(BusinessException e) {
    log.warn("业务异常: code={} msg={}", e.getCode(), e.getMessage());
    return Result.fail(e.getCode(), e.getMessage());
  }

  // 参数校验失败（@Valid 触发）
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public Result<Void> handleValidation(MethodArgumentNotValidException e) {
    String msg = e.getBindingResult().getFieldErrors().stream()
      .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
      .collect(Collectors.joining("; "));
    log.warn("参数校验失败: {}", msg);
    return Result.fail(400, msg);
  }

  // 兜底：所有未处理异常（500）
  @ExceptionHandler(Exception.class)
  public Result<Void> handleAll(Exception e, HttpServletRequest req) {
    log.error("系统异常: {} {}", req.getMethod(), req.getRequestURI(), e);
    return Result.fail(500, "服务器内部错误，请稍后重试");
  }
}`;

  // ── Section 6: 前端类比 ───────────────────────────────────────────────────────

  const axiosInterceptorCode = `// 前端 axios 拦截器 ≈ Filter + @ControllerAdvice

// 请求拦截器（≈ Filter.doFilter 前置部分）
axios.interceptors.request.use(config => {
  config.headers['X-Trace-Id'] = generateTraceId(); // 注入 traceId
  config.headers['Authorization'] = getToken();      // 注入 token
  console.log('→ 请求:', config.method, config.url);
  return config;
});

// 响应拦截器（≈ Filter.doFilter 后置 + @ControllerAdvice）
axios.interceptors.response.use(
  response => {
    console.log('← 响应:', response.config.url, response.data);
    return response.data; // 统一解包
  },
  error => {
    if (error.response?.status === 401) {
      router.push('/login'); // 全局处理未登录
    } else if (error.response?.status === 500) {
      message.error('服务器异常，请稍后重试');
    }
    return Promise.reject(error);
  }
);`;

  const fePair = codeBlocksRow([
    codeBlock('前端：axios 拦截器', 'dot-blue', 'typescript', axiosInterceptorCode),
    codeBlock('Java：全局异常处理 @RestControllerAdvice', 'dot-orange', 'java', globalExceptionCode),
  ]);

  // ── Section 7: 选型指南 ───────────────────────────────────────────────────────

  const choiceRows = [
    ['注入 traceId / token 解析',   'Filter',              '最早执行，能拿到原始 Request 字节，适合做全局上下文初始化'],
    ['按注解控制接口权限',          'HandlerInterceptor',  '能拿到 HandlerMethod，可读取方法注解（@LoginRequired 等）'],
    ['记录 Service 方法入参/耗时',  '@Aspect',             'AOP 切面粒度最细，可切任意 Bean 的任意方法，不限于 HTTP'],
    ['统一异常返回格式',            '@ControllerAdvice',   'Controller 层专属，自动将异常转成标准 JSON 响应'],
    ['前端：全局请求处理',          'axios 拦截器',        '等价于 Filter，注入 token/traceId，统一处理 401/500'],
  ];
  const choiceTable = compareCard(choiceRows, ['场景', 'Java 方案']);

  const asyncWarning = ruleBox('danger',
    `<strong>MDC 与异步线程的陷阱：</strong><br><br>
    MDC 基于 <code>ThreadLocal</code>，使用 <code>@Async</code> 或 <code>CompletableFuture</code> 时，子线程<strong>不会</strong>自动继承父线程的 MDC。<br><br>
    解决方案：<br>
    1. <code>MDC.getCopyOfContextMap()</code> 在提交任务前复制，子线程内 <code>MDC.setContextMap()</code> 恢复<br>
    2. 使用 <code>TaskDecorator</code> 自动传递（Spring 线程池配置 <code>setTaskDecorator</code>）<br>
    3. 使用 SkyWalking / OpenTelemetry 等 APM 框架，自动透传链路上下文`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('三层拦截点对比', layerTable)}
    ${section('MDC 链路追踪：让所有日志自动带上 traceId', mdcBox + mdcPair)}
    ${section('接口日志：AOP 切面 vs HandlerInterceptor', aopInterceptorPair)}
    ${section('全局异常处理 vs 前端 axios 响应拦截', fePair)}
    ${section('选型指南', choiceTable)}
    ${section('常见陷阱', asyncWarning)}`);
}
