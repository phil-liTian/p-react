function renderSpringBootAutoconfig(t) {
  const conclusion = ruleBox('info',
    `<strong>Spring Boot 的核心魔法：加一个 starter 依赖，功能就"自动好了"——不需要写一行配置 Bean。</strong><br><br>
    本质是<strong>条件装配</strong>：Spring Boot 在启动时扫描 classpath，发现某个类存在（比如 <code>HikariDataSource</code>），
    就自动创建对应的 Bean（数据库连接池）并注入配置文件中的参数。<br><br>
    前端类比：类似 Vite 的插件系统——装了 <code>@vitejs/plugin-react</code>，JSX 就自动能用了，不需要手动配置 Babel。`);

  // ── Section 1: @SpringBootApplication 拆解 ───────────────────────────────────

  const compositeBox = ruleBox('info',
    `<strong>@SpringBootApplication = 三个注解的组合：</strong><br><br>
    • <code>@SpringBootConfiguration</code>（= <code>@Configuration</code>）：声明当前类是配置类，可以用 <code>@Bean</code> 方法注册 Bean<br>
    • <code>@EnableAutoConfiguration</code>：开启自动配置，让 Spring Boot 扫描 classpath 并自动装配 Bean<br>
    • <code>@ComponentScan</code>：扫描当前包及子包下所有 <code>@Component/@Service/@Repository/@Controller</code>，注册为 Bean`);

  const compositeCode = `// 你写的启动类
@SpringBootApplication  // 一个注解顶三个
public class MyAppApplication {
  public static void main(String[] args) {
    SpringApplication.run(MyAppApplication.class, args);
  }
}

// 展开等价于：
@SpringBootConfiguration  // = @Configuration
@EnableAutoConfiguration  // 自动配置的开关
@ComponentScan(basePackages = "com.example.myapp") // 扫描当前包
public class MyAppApplication { ... }

// 重要：启动类必须放在最顶层包（com.example.myapp），
// 因为 @ComponentScan 默认只扫描当前包及其子包
// ❌ 如果放在 com.example.myapp.config 下，同级的 controller/service 会扫描不到`;

  // ── Section 2: 自动配置原理 ───────────────────────────────────────────────────

  const autoConfigCode = `// @EnableAutoConfiguration 的工作原理

// 1. Spring Boot 启动时读取所有 jar 包中的：
//    META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
//    （Spring Boot 2.x 是 META-INF/spring.factories）
//
// 2. 该文件列出了所有候选自动配置类，例如：
//    org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
//    org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration
//    org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration
//    ...（Spring Boot 内置约 150 个）
//
// 3. 每个自动配置类上都有条件注解，只有条件满足才会生效：

@Configuration
@ConditionalOnClass(DataSource.class)   // classpath 有 DataSource 类才生效
@ConditionalOnMissingBean(DataSource.class) // 用户没有自定义 DataSource Bean 才生效
@EnableConfigurationProperties(DataSourceProperties.class) // 绑定 application.yml 配置
public class DataSourceAutoConfiguration {

  @Bean
  public DataSource dataSource(DataSourceProperties props) {
    // 根据 application.yml 中的 spring.datasource.* 创建连接池
    return DataSourceBuilder.create()
        .url(props.getUrl())
        .username(props.getUsername())
        .password(props.getPassword())
        .build();
  }
}

// 等价于前端：
// if (resolvedConfig.plugins.includes('@vitejs/plugin-react')) {
//   addBabelTransform({ plugins: ['@babel/plugin-transform-react-jsx'] });
// }`;

  // ── Section 3: 条件注解速查 ───────────────────────────────────────────────────

  const conditionalRows = [
    ['@ConditionalOnClass(Foo.class)',       'classpath 存在 Foo 类',         '装了对应依赖才生效（最常用）'],
    ['@ConditionalOnMissingBean(Foo.class)', '容器中没有 Foo 类型的 Bean',     '允许用户覆盖默认配置'],
    ['@ConditionalOnProperty("app.feature")', 'application.yml 配置项存在',  '功能开关，配置了才启用'],
    ['@ConditionalOnWebApplication',         '当前是 Web 应用',               '只在 Servlet 环境生效'],
    ['@ConditionalOnExpression("#{...}")',   'SpEL 表达式为 true',            '复杂条件判断'],
  ];
  const conditionalTable = compareCard(conditionalRows, ['条件注解', '生效条件']);

  // ── Section 4: Starter 是什么 ────────────────────────────────────────────────

  const starterBox = ruleBox('success',
    `<strong>Starter = 依赖的"套餐"，把一个功能需要的所有 jar 打包在一起，同时内含自动配置类。</strong><br><br>
    加一个 <code>spring-boot-starter-web</code>，Spring Boot 自动引入：<br>
    <code>spring-webmvc</code>（Spring MVC 核心）、<code>tomcat-embed</code>（内嵌 Tomcat）、<code>jackson-databind</code>（JSON 序列化）、
    <code>hibernate-validator</code>（参数校验）……并自动配置好 DispatcherServlet、MessageConverter 等。`);

  const starterRows = [
    ['spring-boot-starter-web',       'REST API 开发',    '内嵌 Tomcat + Spring MVC + Jackson'],
    ['spring-boot-starter-data-jpa',  'JPA / Hibernate',  '数据库 ORM，自动配置 EntityManager'],
    ['spring-boot-starter-data-redis','Redis 客户端',      'Lettuce + RedisTemplate 自动配置'],
    ['spring-boot-starter-security',  '安全 / 认证',       '自动开启 HTTP Basic Auth，可扩展为 JWT/OAuth2'],
    ['spring-boot-starter-test',      '测试套件',          'JUnit5 + Mockito + AssertJ + Spring Test'],
    ['mybatis-spring-boot-starter',   'MyBatis',           '第三方 Starter，自动配置 SqlSessionFactory'],
  ];
  const starterTable = compareCard(starterRows, ['Starter', '用途']);

  // ── Section 5: application.yml 绑定原理 ──────────────────────────────────────

  const configPropsCode = `// application.yml
app:
  jwt:
    secret: my-secret-key
    expiration: 86400   # 秒

# ─────────────────────────────────────────────────────────

// @ConfigurationProperties：把 yml 配置绑定到 Java 类
@Component
@ConfigurationProperties(prefix = "app.jwt")  // 对应 yml 中的 app.jwt 前缀
public class JwtProperties {
  private String secret;   // 对应 app.jwt.secret
  private int expiration;  // 对应 app.jwt.expiration

  // Getter / Setter（或使用 Lombok @Data）
}

// 使用时直接注入
@Service
public class JwtService {

  @Autowired
  private JwtProperties jwtProps;  // Spring 自动注入并填充了 yml 中的值

  public String generateToken(String userId) {
    return Jwts.builder()
        .setSubject(userId)
        .setExpiration(Date.from(Instant.now().plusSeconds(jwtProps.getExpiration())))
        .signWith(Keys.hmacShaKeyFor(jwtProps.getSecret().getBytes()))
        .compact();
  }
}

// 前端类比：
// import.meta.env.VITE_JWT_SECRET  ←→  jwtProps.getSecret()
// 都是"从配置文件读取，注入到业务代码"，只是方式不同`;

  // ── Section 6: 覆盖默认配置 ──────────────────────────────────────────────────

  const overrideCode = `// @ConditionalOnMissingBean 让你可以覆盖默认配置

// Spring Boot 默认自动配置了 Jackson 的 ObjectMapper
// 如果你想自定义（比如禁止序列化 null 字段、设置日期格式），只需声明自己的 Bean：

@Configuration
public class JacksonConfig {

  @Bean  // 你声明了 ObjectMapper Bean，Spring Boot 的自动配置就不再生效
  public ObjectMapper objectMapper() {
    return Jackson2ObjectMapperBuilder.json()
        .serializationInclusion(JsonInclude.Include.NON_NULL)  // 不序列化 null
        .simpleDateFormat("yyyy-MM-dd HH:mm:ss")               // 日期格式
        .build();
  }
}

// 这就是 @ConditionalOnMissingBean 的价值：
// "如果用户自定义了，用用户的；否则用我的默认配置"
// 前端类比：Vite 的 defineConfig 合并策略——用户配置覆盖默认配置`;

  const twoCode = codeBlocksRow([
    codeBlock('application.yml + @ConfigurationProperties', 'dot-blue', 'java', configPropsCode),
    codeBlock('覆盖默认自动配置', 'dot-orange', 'java', overrideCode),
  ]);

  // ── Section 7: 前端类比总结 ───────────────────────────────────────────────────

  const feRows = [
    ['vite.config.ts',              'application.yml',         '项目配置文件'],
    ['import.meta.env.VITE_XXX',    '@ConfigurationProperties', '从配置文件注入到代码'],
    ['@vitejs/plugin-react（装了就能用）', 'spring-boot-starter-web', 'Starter / 插件，开箱即用'],
    ['Vite 自动处理 JSX',           '@ConditionalOnClass 自动配置', '检测到依赖就自动启用'],
    ['vite.config.ts 覆盖默认',     '@Bean 覆盖 @ConditionalOnMissingBean', '用户配置覆盖框架默认'],
  ];
  const feTable = compareCard(feRows, ['前端（Vite）', 'Java（Spring Boot）']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('@SpringBootApplication 拆解', compositeBox + codeBlock('@SpringBootApplication 展开', 'dot-orange', 'java', compositeCode))}
    ${section('自动配置的工作原理', codeBlock('@EnableAutoConfiguration 原理（注释版）', 'dot-blue', 'java', autoConfigCode))}
    ${section('条件注解速查', conditionalTable)}
    ${section('Starter 是什么', starterBox + starterTable)}
    ${section('配置绑定 + 覆盖默认配置', twoCode)}
    ${section('前端类比速查', feTable)}`);
}
