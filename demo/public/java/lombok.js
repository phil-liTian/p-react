function renderLombok(t) {
  const conclusion = ruleBox('info',
    `<strong>Lombok 是通过"编译期注解处理"自动生成样板代码的工具——你只写字段，它生成 Getter/Setter/构造器/equals/hashCode/toString。</strong><br><br>
    本质是 Java 编译器（javac）的插件：在编译阶段扫描到 <code>@Getter</code> 等注解时，直接向 AST 注入对应方法。<br>
    运行时没有 Lombok 介入——字节码里已经有这些方法了，所以部署时不需要把 Lombok 打进生产 jar（仅编译期依赖）。<br><br>
    前端类比：类似 Vite/Babel 插件——你写简写语法，编译器在构建时转成完整代码；运行时不依赖插件本身。`);

  // ── Section 1: 没有 Lombok 的痛点 ─────────────────────────────────────────────

  const painCode = `// ❌ 传统 Java POJO：50 行里 40 行是样板

public class UserDTO {
  private Long id;
  private String name;
  private String email;
  private Integer age;

  public UserDTO() {}                              // 无参构造

  public UserDTO(Long id, String name,             // 全参构造
                 String email, Integer age) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.age = age;
  }

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public Integer getAge() { return age; }
  public void setAge(Integer age) { this.age = age; }

  @Override
  public boolean equals(Object o) {                // IDE 自动生成，几十行
    if (this == o) return true;
    if (!(o instanceof UserDTO)) return false;
    UserDTO userDTO = (UserDTO) o;
    return Objects.equals(id, userDTO.id)
        && Objects.equals(name, userDTO.name)
        && Objects.equals(email, userDTO.email)
        && Objects.equals(age, userDTO.age);
  }

  @Override
  public int hashCode() { return Objects.hash(id, name, email, age); }

  @Override
  public String toString() {                       // IDE 自动生成
    return "UserDTO{" + "id=" + id + ", name='" + name + '\\''
        + ", email='" + email + '\\'' + ", age=" + age + '}';
  }
}`;

  const lombokCode = `// ✅ Lombok 等价写法：5 行搞定全部

@Getter                      // 生成所有字段的 getXxx()
@Setter                      // 生成所有字段的 setXxx()
@ToString                    // 生成 toString()
@EqualsAndHashCode           // 生成 equals() 和 hashCode()
@NoArgsConstructor           // 生成无参构造器
@AllArgsConstructor          // 生成全参构造器
public class UserDTO {
  private Long id;
  private String name;
  private String email;
  private Integer age;
}

// 编译后 javap -p UserDTO.class 可以看到：
// public Long getId();
// public void setId(Long);
// public String getName();
// ...
// public UserDTO();
// public UserDTO(Long, String, String, Integer);
// public boolean equals(Object);
// public int hashCode();
// public String toString();`;

  const painPair = codeBlocksRow([
    codeBlock('❌ 不用 Lombok：手写一堆样板', 'dot-red', 'java', painCode),
    codeBlock('✅ 用 Lombok：注解一行搞定', 'dot-green', 'java', lombokCode),
  ]);

  // ── Section 2: 核心注解全览 ──────────────────────────────────────────────────

  const annotationRows = [
    ['@Getter / @Setter',  '生成 getter/setter',     '标在类上生成所有字段；标在字段上只生成该字段。支持 access 等控制可见性'],
    ['@ToString',          '生成 toString()',         '默认包含所有字段。可排除某字段：@ToString(exclude = "password")'],
    ['@EqualsAndHashCode', '生成 equals/hashCode',   '默认用所有非静态字段。可 callSuper=true 包含父类字段'],
    ['@NoArgsConstructor', '无参构造器',              '生成无参构造。如果类有 final 字段会报错（需配合 @RequiredArgsConstructor）'],
    ['@AllArgsConstructor','全参构造器',             '生成包含所有字段的构造器'],
    ['@RequiredArgsConstructor','final/@NonNull 字段构造器','只为 final 字段和 @NonNull 标注的字段生成构造器——Spring 依赖注入最常用'],
    ['@Data',              '打包注解',               '=@Getter + @Setter + @ToString + @EqualsAndHashCode + @RequiredArgsConstructor'],
    ['@Value',             '不可变 DTO',             '=@Data 的不可变版：字段全 final、无 setter、类 final。适合做值对象'],
    ['@Builder',           '建造者模式',             '生成 builder()，链式设置字段。字段多时比构造器清晰：User.builder().name("Tom").age(18).build()'],
    ['@Singular',          '集合字段 builder',       '配合 @Builder 用于 List/Set，生成单元素 add 方法'],
    ['@NonNull',           '空值校验',              '标在字段/参数上，方法入口若为 null 直接抛 NullPointerException'],
    ['@Cleanup',           '自动资源关闭',           '局部变量上加 @Cleanup，方法结束自动调 close()——替代 try-with-resources'],
    ['@SneakyThrows',      '偷偷抛受检异常',         '把 checked exception 包装成 unchecked 抛出，省去 throws 声明'],
    ['@Slf4j',             '日志字段',              '生成 private static final Logger log = LoggerFactory.getLogger(Xxx.class)。同类还有 @Log4j2 等'],
    ['@FieldDefaults',     '字段默认修饰符',         '类级别声明字段默认 private final 等修饰符'],
    ['@Accessors(chain=true)','链式 setter',         'setter 返回 this，可 user.setName("Tom").setAge(18)'],
  ];
  const annotationTable = compareCard(annotationRows, ['注解', '用途', '说明']);

  // ── Section 3: @Data 详解（最常用）──────────────────────────────────────────

  const dataBox = ruleBox('success',
    `<strong>@Data 是日常开发最常用的注解——90% 的 DTO/VO/Entity 用它就够了。</strong><br>
    它等价于一次性贴了 5 个注解。但要注意：@Data 默认不会生成全参构造器和无参构造器，<br>
    通常配合 <code>@NoArgsConstructor</code> + <code>@AllArgsConstructor</code> 一起用。`);

  const dataCode = `// DTO 实战写法
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
  private Long id;
  private String name;
  private String email;
}

// Entity 写法：JPA/MyBatis-Plus 要求有无参构造
@Data
@NoArgsConstructor
@AllArgsConstructor
@TableName("t_user")              // MyBatis-Plus 表注解
public class User {
  @TableId(type = IdType.AUTO)     // 主键自增
  private Long id;

  private String name;

  @TableField("email_address")     // 字段名映射
  private String email;
}

// 使用
UserDTO dto = new UserDTO(1L, "Tom", "tom@x.com");
dto.getName();                     // 编译期由 Lombok 注入
dto.setName("Jerry");
dto.toString();                    // UserDTO(id=1, name=Jerry, email=tom@x.com)
dto.equals(otherDto);              // 按字段值比较`;

  // ── Section 4: @Builder（构造复杂对象）──────────────────────────────────────

  const builderCode = `// 场景：一个类有 8 个字段，用构造器容易写错位置
@Builder
@Data
public class CreateOrderRequest {
  private Long userId;
  private Long productId;
  private Integer quantity;
  private BigDecimal amount;
  private String address;
  private String couponCode;
  private Boolean needInvoice;
  private String remark;
}

// 传统构造器写法：参数顺序难记，易错
new CreateOrderRequest(1L, 100L, 2, new BigDecimal("99"),
    "北京市", null, false, "尽快发货");  // 哪个是哪个？

// Builder 写法：字段名即文档，顺序无关
CreateOrderRequest req = CreateOrderRequest.builder()
    .userId(1L)
    .productId(100L)
    .quantity(2)
    .amount(new BigDecimal("99"))
    .address("北京市")
    .needInvoice(false)
    .remark("尽快发货")
    .build();

// 配合 @Singular 处理集合
@Builder
public class Order {
  private Long id;
  @Singular("item")          // 生成 .item(x) 和 .items(list) 两个方法
  private List<OrderItem> items;
}

Order order = Order.builder()
    .id(1L)
    .item(item1)             // 单个 add
    .item(item2)
    .items(otherItems)       // 批量 add
    .build();`;

  // ── Section 5: 日志注解（最常用之一）──────────────────────────────────────

  const logCode = `// ❌ 不用 Lombok：每个类都写一遍
@Service
public class OrderService {
  private static final Logger log = LoggerFactory.getLogger(OrderService.class);

  public void create() {
    log.info("create order");
  }
}

// ✅ 用 @Slf4j：一行代替
@Slf4j
@Service
public class OrderService {
  public void create() {
    log.info("create order");    // log 字段由 Lombok 注入
  }
}

// 同系列日志注解（按日志框架选）
@Slf4j        // → org.slf4j.Logger  log     （最常用，Spring Boot 默认 logback）
@Log4j2       // → org.apache.logging.log4j.Logger  log
@CommonsLog   // → org.apache.commons.logging.Log  log
@Log          // → java.util.logging.Logger  log`;

  // ── Section 6: Spring + Lombok 经典组合 ──────────────────────────────────────

  const springBox = ruleBox('accent',
    `<strong>Spring 项目里最常见的 Lombok 组合：</strong> <code>@RequiredArgsConstructor</code> + <code>final</code> 字段实现构造器注入。<br>
    这是 Spring 官方推荐的注入方式——既保持不可变性，又免去手写构造器。`);

  const springCode = `// ✅ Spring 推荐写法：构造器注入 + Lombok

@Service
@RequiredArgsConstructor                  // Lombok 生成构造器
public class OrderService {
  private final OrderMapper orderMapper;            // final → 强制构造器注入
  private final NotificationService notificationService;
  private final ApplicationProperties properties;

  @Transactional
  public void create(Order order) {
    log.info("creating order");            // 配合 @Slf4j
    orderMapper.insert(order);
    notificationService.notify(order);
  }
}

// Lombok 实际生成的等价代码：
@Service
public class OrderService {
  private final OrderMapper orderMapper;
  private final NotificationService notificationService;
  private final ApplicationProperties properties;

  public OrderService(OrderMapper orderMapper,
                      NotificationService notificationService,
                      ApplicationProperties properties) {
    this.orderMapper = orderMapper;
    this.notificationService = notificationService;
    this.properties = properties;
  }
  // ...
}

// 为什么构造器注入优于 @Autowired 字段注入？
// 1. 不可变：final 字段无法被重新赋值，更安全
// 2. 显式依赖：一眼看出这个类依赖什么
// 3. 可测试：单元测试可直接 new OrderService(mock1, mock2, mock3)
// 4. 避免循环依赖：Spring 启动时若依赖成环会直接报错，不会留到运行时`;

  // ── Section 7: val/var 局部变量类型推断 ─────────────────────────────────────

  const valCode = `// Lombok 的 val/var：类似 JS 的 let/const，让 Java 写起来更轻

// ❌ 传统写法：类型太长
Map<String, List<User>> grouped = users.stream()
    .collect(Collectors.groupingBy(User::getDept));
List<OrderDTO> dtos = orders.stream()
    .map(o -> convertToDto(o))
    .collect(Collectors.toList());
HashMap<String, Object> cache = new HashMap<>();

// ✅ val（Java 10+ 已有 var，Lombok val 是更早的方案）
val grouped = users.stream()
    .collect(Collectors.groupingBy(User::getDept));  // 推断为 Map<String, List<User>>
val dtos = orders.stream()
    .map(o -> convertToDto(o))
    .collect(Collectors.toList());
val cache = new HashMap<String, Object>();            // 推断为 HashMap<String, Object>

// val vs var
val x = "hello";   // 等价 final String x = "hello"（不可变引用）
var y = "hello";   // 等价 String y = "hello"（可重新赋值）

// 注意：Java 10+ 内置 var 已能覆盖大部分场景，val 仅在低版本 Java 有意义
// 现代 Spring Boot（Java 17+）推荐直接用 var`;

  // ── Section 8: @Cleanup 自动关闭资源 ───────────────────────────────────────

  const cleanupCode = `// ❌ 传统写法：try-with-resources
public String readFile(String path) throws IOException {
  try (BufferedReader br = new BufferedReader(new FileReader(path))) {
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = br.readLine()) != null) {
      sb.append(line);
    }
    return sb.toString();
  }
}

// ✅ @Cleanup：方法结束自动调 close()
public String readFile(String path) throws IOException {
  @Cleanup BufferedReader br = new BufferedReader(new FileReader(path));
  StringBuilder sb = new StringBuilder();
  String line;
  while ((line = br.readLine()) != null) {
    sb.append(line);
  }
  return sb.toString();
  // br.close() 在这里被自动调用（finally 块）
}

// 自定义关闭方法（默认调 close()，可指定其他）
@Cleanup("disconnect")
Connection conn = createConnection();`;

  // ── Section 9: @SneakyThrows 绕过受检异常 ──────────────────────────────────

  const sneakyCode = `// ❌ 受检异常必须 throws 或 try-catch，污染方法签名
public void write(String content) throws IOException {
  Files.write(Paths.get("a.txt"), content.getBytes());
}

// 调用方也被迫处理
public void caller() throws IOException {
  write("hello");
}

// ✅ @SneakyThrows：偷偷抛，调用方无感
@SneakyThrows                      // 编译期通过字节码技巧绕过检查
public void write(String content) {
  Files.write(Paths.get("a.txt"), content.getBytes());
}

public void caller() {             // 不用 throws
  write("hello");
}

// 慎用！这破坏了 Java 的异常检查机制，建议只在以下场景用：
// 1. 工具方法想抛 RuntimeException 但又懒得包装
// 2. 接口定义不允许 throws，但内部确实有受检异常
// 3. 测试代码里简化签名`;

  // ── Section 10: 安装与启用 ──────────────────────────────────────────────────

  const installCode = `// Maven（pom.xml）
<dependency>
  <groupId>org.projectlombok</groupId>
  <artifactId>lombok</artifactId>
  <version>1.18.34</version>
  <scope>provided</scope>           <!-- 关键：编译期依赖，不打包 -->
</dependency>

// Gradle（build.gradle）
dependencies {
  compileOnly 'org.projectlombok:lombok:1.18.34'
  annotationProcessor 'org.projectlombok:lombok:1.18.34'
}

// IDE 支持
// IntelliJ IDEA：安装 Lombok 插件（2020.3+ 已内置）+ 开启
//   Settings → Build → Compiler → Annotation Processors → Enable

// Spring Boot 项目：spring-boot-starter-parent 已包含 Lombok 版本管理
<dependency>
  <groupId>org.projectlombok</groupId>
  <artifactId>lombok</artifactId>
  <scope>provided</scope>           <!-- 不写 version，由 Spring Boot BOM 管理 -->
</dependency>`;

  // ── Section 11: 优缺点与避坑 ────────────────────────────────────────────────

  const prosConsRows = [
    ['代码量',          '✅ 减少 30%~50% 样板',  'POJO/Service 类从 80 行变 30 行'],
    ['可读性',          '✅ 意图更清晰',         '字段一目了然，不被 getXxx 淹没'],
    ['维护性',          '✅ 加字段只改一行',      '加字段不用补 getter/setter/toString'],
    ['调试',            '⚠️ 看不到生成的方法',   '断点能进，但 IDE 源码里看不到对应方法（需装插件）'],
    ['版本耦合',        '⚠️ 依赖 JDK/Lombok 版本','Lombok 通过 hack javac 内部 API 实现，JDK 升级可能不兼容'],
    ['团队协作',        '⚠️ 全员都要装插件',      '新人 IDE 不装 Lombok 插件会满屏报错'],
    ['@Data 滥用',     '⚠️ Entity 慎用',         'JPA Entity 用 @Data 可能因 equals/hashCode 触发懒加载，应改用 @Getter @Setter'],
    ['@Builder + 继承', '⚠️ 不支持父类字段',      'Builder 不会包含父类字段，需要手写或用 @SuperBuilder'],
    ['@AllArgsConstructor 单独用', '⚠️ 可能爆无参构造缺失','框架（JPA/MyBatis-Plus/Jackson）常要求无参构造，需补 @NoArgsConstructor'],
  ];
  const prosConsTable = compareCard(prosConsRows, ['维度', '评价', '说明']);

  const pitfallBox = ruleBox('danger',
    `<strong>三个最常见的踩坑：</strong><br>
    1. <strong>JPA Entity 用 @Data 触发懒加载</strong>——equals/hashCode 会访问关联字段，触发 N+1 查询甚至 StackOverflow。Entity 应改用 <code>@Getter @Setter @ToString(exclude="...")</code><br>
    2. <strong>缺少无参构造</strong>——Jackson 反序列化、JPA 实体化、MyBatis 映射都要求无参构造。<code>@Data</code> 不生成无参构造，需补 <code>@NoArgsConstructor</code><br>
    3. <strong>IDE 报红找不到方法</strong>——必须安装 Lombok 插件并开启注解处理。CI 服务器也要 Maven/Gradle 配置正确`);

  // ── Section 12: 前端类比速查 ───────────────────────────────────────────────

  const feRows = [
    ['TypeScript 接口自动生成',  '@Data',                '声明字段，工具自动生成方法'],
    ['class-transformer',       '@Data / @Builder',      'POJO 转换与构造'],
    ['Babel 插件 / Vite 插件',  'Annotation Processor', '编译期介入，运行时无依赖'],
    ['JS 的 let/const',         'val / var',             '类型推断，少写类型'],
    ['try-with-resources',      '@Cleanup',              '自动资源管理'],
    ['装饰器（@decorator）',    '@Slf4j / @Builder',     '类级别声明，框架接管实现'],
    ['defineComponent({ ... })','@Data 类',              '声明式描述，框架生成样板'],
  ];
  const feTable = compareCard(feRows, ['前端', 'Lombok', '本质类比']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('没有 Lombok 的痛点', painPair)}
    ${section('核心注解全览', annotationTable)}
    ${section('@Data 详解（最常用）', dataBox + codeBlock('@Data 实战写法', 'dot-green', 'java', dataCode))}
    ${section('@Builder（构造复杂对象）', codeBlock('Builder 模式对比', 'dot-blue', 'java', builderCode))}
    ${section('日志注解（@Slf4j）', codeBlock('日志字段自动注入', 'dot-orange', 'java', logCode))}
    ${section('Spring + Lombok 经典组合', springBox + codeBlock('构造器注入 + Lombok', 'dot-green', 'java', springCode))}
    ${section('val / var 局部变量类型推断', codeBlock('类型推断写法', 'dot-blue', 'java', valCode))}
    ${section('@Cleanup 自动关闭资源', codeBlock('资源管理对比', 'dot-orange', 'java', cleanupCode))}
    ${section('@SneakyThrows 绕过受检异常', codeBlock('受检异常处理', 'dot-red', 'java', sneakyCode))}
    ${section('安装与启用', codeBlock('Maven / Gradle / IDE', 'dot-blue', 'xml', installCode))}
    ${section('优缺点与避坑', prosConsTable + pitfallBox)}
    ${section('前端类比速查', feTable)}`);
}
