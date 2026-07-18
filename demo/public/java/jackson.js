function renderJackson(t) {
  const conclusion = ruleBox('info',
    `<strong>Jackson 是 Java 生态最主流的 JSON 处理库——Spring Boot 默认的 JSON 序列化器，所有 <code>@RestController</code> 返回的 JSON 都由它生成。</strong><br><br>
    核心是 <code>ObjectMapper</code>：把 Java 对象 → JSON 字符串叫<strong>序列化</strong>（writeValueAsString），反向叫<strong>反序列化</strong>（readValue）。<br>
    它通过反射读写字段，所以配合 Lombok 的 <code>@Data</code>（提供 getter/setter）和无参构造器即可工作。<br><br>
    前端类比：Jackson ≈ <code>JSON.stringify</code> + <code>JSON.parse</code> 的超集，但它可定制字段名、日期格式、空值处理等，相当于 <code>JSON.stringify</code> 配合 <code>replacer/reviver</code> 的强化版。`);

  // ── Section 1: 快速上手 ──────────────────────────────────────────────────────

  const quickCode = `import com.fasterxml.jackson.databind.ObjectMapper;

ObjectMapper mapper = new ObjectMapper();

// 序列化：Java 对象 → JSON 字符串
User user = new User(1L, "Tom", "tom@x.com");
String json = mapper.writeValueAsString(user);
// → {"id":1,"name":"Tom","email":"tom@x.com"}

// 反序列化：JSON 字符串 → Java 对象
User parsed = mapper.readValue(json, User.class);
// → User{id=1, name='Tom', email='tom@x.com'}

// 集合 / Map 反序列化需要 TypeReference（泛型擦除问题）
List<User> list = mapper.readValue(jsonArrayStr,
    new TypeReference<List<User>>() {});
Map<String, Object> map = mapper.readValue(jsonStr,
    new TypeReference<Map<String, Object>>() {});`;

  const quickFrontCode = `// 前端等价写法：JSON.stringify / JSON.parse

const user = { id: 1, name: 'Tom', email: 'tom@x.com' };
const json = JSON.stringify(user);
// → '{"id":1,"name":"Tom","email":"tom@x.com"}'

const parsed = JSON.parse(json);
// → { id: 1, name: 'Tom', email: 'tom@x.com' }

// 集合天然支持（JS 没有泛型擦除问题）
const list = JSON.parse(jsonArrayStr);
const map  = JSON.parse(jsonStr);`;

  const quickPair = codeBlocksRow([
    codeBlock('Java：ObjectMapper', 'dot-orange', 'java', quickCode),
    codeBlock('前端：JSON 内置 API', 'dot-blue', 'javascript', quickFrontCode),
  ]);

  // ── Section 2: 核心注解全览 ──────────────────────────────────────────────────

  const annotationRows = [
    ['@JsonProperty("xxx")',  '字段重命名',         '序列化/反序列化都用 xxx 作为 JSON key。前端 camelCase ↔ Java camelCase 通常无需改，对接老接口 snake_case 时常用'],
    ['@JsonIgnore',           '忽略字段',           '该字段不参与序列化/反序列化。常用于密码、内部状态'],
    ['@JsonFormat',           '日期/数字格式',       '@JsonFormat(pattern = "yyyy-MM-dd", timezone = "GMT+8")，针对 Date/LocalDate'],
    ['@JsonAlias',            '反序列化别名',        'readValue 时接受多个 key 名，序列化仍用主名。前端传 user_name 或 userName 都能映射'],
    ['@JsonInclude',          '空值策略',           '@JsonInclude(NON_NULL) 表示字段为 null 时不输出，省流量'],
    ['@JsonCreator',          '指定反序列化构造器',  '配合 @JsonProperty 指定哪个构造器用于反序列化，常用于不可变对象'],
    ['@JsonSerialize',        '自定义序列化器',      '指定一个 implements JsonSerializer 的类，完全接管字段输出'],
    ['@JsonDeserialize',      '自定义反序列化器',    '指定一个 implements JsonDeserializer 的类，完全接管字段解析'],
    ['@JsonView',             '视图分组',           '同一对象按视图返回不同字段。如 User.Views.Public 只返回 name，Views.Internal 返回全部'],
    ['@JsonUnwrapped',        '展开嵌套对象',        '把内层字段"提升"到外层。{"user":{"name":"Tom"}} → {"name":"Tom"}'],
    ['@JsonRootName',         '根节点包裹',          '配合 mapper.enable(UNWRAP_ROOT_VALUE) 在外层包一层命名空间'],
    ['@JsonValue',            '用字段值代表整个对象','枚举常用：标在getType()上，序列化时直接输出 "VIP" 而不是 {"type":"VIP"}'],
    ['@JsonEnumDefaultValue', '枚举未知值兜底',      '反序列化遇到未知枚举值时回退到此字段（需开启 FAIL_ON_UNKNOWN_ENUMS）'],
    ['@JsonNaming',           '批量命名策略',         '类级别 @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)，全部字段转下划线'],
    ['@JsonTypeId',           '多态类型标识',         '配合 @JsonTypeInfo 实现多态序列化，标明用哪个字段作为类型判别'],
  ];
  const annotationTable = compareCard(annotationRows, ['注解', '用途', '说明']);

  // ── Section 3: 字段重命名实战 ───────────────────────────────────────────────

  const renameCode = `// 场景：对接老接口，前端用下划线风格（snake_case），Java 用驼峰

// ❌ 不做处理：JSON key 和字段名一致（camelCase）
@Data
public class UserDTO {
  private Long userId;
  private String userName;
}
// → {"userId":1,"userName":"Tom"}   ← 前端可能期望 user_id / user_name

// ✅ 方式 1：逐字段重命名
@Data
public class UserDTO {
  @JsonProperty("user_id")
  private Long userId;

  @JsonProperty("user_name")
  private String userName;
}
// → {"user_id":1,"user_name":"Tom"}

// ✅ 方式 2：类级别批量转下划线（更省事）
@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class UserDTO {
  private Long userId;        // → user_id
  private String userName;    // → user_name
  private String emailAddr;   // → email_addr
}
// → {"user_id":1,"user_name":"Tom","email_addr":"..."}`;

  // ── Section 4: 忽略与空值控制 ───────────────────────────────────────────────

  const ignoreCode = `// 场景：返回给前端的 VO 不含敏感字段；字段为 null 时不输出

@Data
@JsonIgnoreProperties(ignoreUnknown = true)   // 反序列化遇到未知字段不报错（重要！）
@JsonInclude(JsonInclude.Include.NON_NULL)    // 字段为 null 时不序列化
public class UserVO {

  private Long id;
  private String name;

  @JsonIgnore                              // 永远不输出，反序列化也忽略
  private String password;

  @JsonInclude(JsonInclude.Include.NON_EMPTY) // null 和 "" 都不输出
  private String remark;

  private LocalDateTime createdAt;
}

// 序列化结果（password 永远消失；remark 为空时也不出现）：
// {"id":1,"name":"Tom","createdAt":"2026-07-15 10:30:00"}

// @JsonInclude 的常用策略：
// ALWAYS        默认，永远输出（含 null）
// NON_NULL      非 null 才输出（最常用）
// NON_EMPTY     非 null 且非 ""、非空集合才输出
// NON_DEFAULT   不等于字段默认值才输出`;

  // ── Section 5: 日期处理（最容易踩坑）──────────────────────────────────────

  const dateCode = `// 默认行为：Date/LocalDateTime 序列化为时间戳（毫秒数）
// → {"createdAt":1721028600000}   ← 前端 new Date(1721028600000) 可用，但不直观

// ✅ 方式 1：字段级别注解
@Data
public class ArticleVO {
  @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
  private LocalDateTime createdAt;

  @JsonFormat(pattern = "yyyy-MM-dd")
  private LocalDate publishDate;          // → "2026-07-15"
}

// → {"createdAt":"2026-07-15 10:30:00","publishDate":"2026-07-15"}

// ✅ 方式 2：全局配置（推荐，所有日期统一格式）
@Configuration
public class JacksonConfig {
  @Bean
  public Jackson2ObjectMapperBuilderCustomizer customizer() {
    return builder -> builder
        .simpleDateFormat("yyyy-MM-dd HH:mm:ss")
        .serializers(new LocalDateTimeSerializer(
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .deserializers(new LocalDateTimeDeserializer(
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
        .timeZone("GMT+8");
  }
}

// ✅ 方式 3：直接配置 ObjectMapper（非 Spring Boot 项目）
ObjectMapper mapper = new ObjectMapper();
mapper.registerModule(new JavaTimeModule());           // 注册 JSR-310 模块
mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS); // 不用时间戳
mapper.setDateFormat(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));`;

  // ── Section 6: 反序列化与校验 ──────────────────────────────────────────────

  const deserCode = `// 反序列化核心：readValue + JavaType / TypeReference

ObjectMapper mapper = new ObjectMapper();

// ① 简单对象
User u = mapper.readValue(json, User.class);

// ② 集合（泛型擦除问题，必须用 TypeReference）
List<User> list = mapper.readValue(json,
    new TypeReference<List<User>>() {});
Map<String, User> map = mapper.readValue(json,
    new TypeReference<Map<String, User>>() {});

// ③ 复杂嵌套：用 TypeFactory 构造 JavaType
JavaType type = mapper.getTypeFactory()
    .constructParametricType(Result.class, User.class);
Result<User> result = mapper.readValue(json, type);

// ④ 流式 API（大文件避免一次性加载）
try (JsonParser parser = mapper.createParser(new File("users.json"))) {
  if (parser.nextToken() != JsonToken.START_ARRAY) return;
  while (parser.nextToken() == JsonToken.START_OBJECT) {
    User u = mapper.readValue(parser, User.class);
    // 逐条处理，避免 OOM
  }
}

// ⑤ 配置：未知字段不报错（兼容前端多传字段）
mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

// ⑥ 配置：空字符串不报错（前端传 "" 当作 null）
mapper.configure(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT, true);`;

  // ── Section 7: Spring Boot 自动配置 ──────────────────────────────────────────

  const springBox = ruleBox('accent',
    `<strong>Spring Boot 已自动配置好一个全局 <code>ObjectMapper</code> Bean</strong>，
    <code>@RestController</code> 返回对象时自动调用它序列化，<code>@RequestBody</code> 接收 JSON 时自动反序列化。<br>
    <strong>不要在代码里 <code>new ObjectMapper()</code></strong>——会绕过 Spring 的统一配置（日期格式、空值策略等），导致前后端格式不一致。`);

  const springCode = `// ✅ Spring Boot 推荐做法：注入全局 ObjectMapper
@Service
@RequiredArgsConstructor
public class OrderService {
  private final ObjectMapper objectMapper;   // Spring 注入的全局实例

  public String toJson(Order order) throws JsonProcessingException {
    return objectMapper.writeValueAsString(order);
  }
}

// ❌ 反例：每个类自己 new 一个
ObjectMapper mapper = new ObjectMapper();  // 丢失全局配置，且创建开销大

// ─── 全局配置方式 ────────────────────────────────────────────────────

// 方式 1：application.yml（最简单，覆盖常用配置）
spring:
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: GMT+8
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false
      fail-on-empty-beans: false
    deserialization:
      fail-on-unknown-properties: false

// 方式 2：自定义 ObjectMapper Bean（完全接管，Spring Boot 自动配置退避）
@Configuration
public class JacksonConfig {
  @Bean
  public ObjectMapper objectMapper() {
    return Jackson2ObjectMapperBuilder.json()
        .modules(new JavaTimeModule())
        .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
        .featuresToDisable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .serializationInclusion(JsonInclude.Include.NON_NULL)
        .build();
  }
}

// 方式 3：Jackson2ObjectMapperBuilderCustomizer（增量修改，不覆盖全部默认）
// 多个模块/库想各自加一些配置时用这种方式，互不覆盖
@Bean
public Jackson2ObjectMapperBuilderCustomizer customizer() {
  return builder -> builder.serializationInclusion(JsonInclude.Include.NON_NULL);
}`;

  // ── Section 8: 自定义序列化器 ───────────────────────────────────────────────

  const customCode = `// 场景：金额字段以"分"存储，但前端要"元"展示；或脱敏手机号

// ① 自定义序列化器：Long 分 → String 元（避免 Long 精度丢失）
public class MoneySerializer extends JsonSerializer<Long> {
  @Override
  public void serialize(Long value, JsonGenerator gen, SerializerProvider sp)
      throws IOException {
    gen.writeString(new BigDecimal(value).divide(new BigDecimal(100))
        .setScale(2, RoundingMode.HALF_UP).toString());
  }
}

// ② 自定义反序列化器：前端传 "12.34" 元 → Long 1234 分
public class MoneyDeserializer extends JsonDeserializer<Long> {
  @Override
  public Long deserialize(JsonParser p, DeserializationContext ctxt)
      throws IOException {
    BigDecimal yuan = new BigDecimal(p.getText());
    return yuan.multiply(new BigDecimal(100)).longValue();
  }
}

// ③ 应用到字段
@Data
public class OrderVO {
  @JsonSerialize(using = MoneySerializer.class)
  @JsonDeserialize(using = MoneyDeserializer.class)
  private Long amount;       // 存储：1234 分  /  JSON： "12.34" 元
}

// ④ 应用到 BigDecimal（全局，避免精度丢失）
// JavaScript Number 最大安全整数是 2^53-1，Long 超过会丢精度
// 解决方案：所有 Long 序列化为 String
@Bean
public Jackson2ObjectMapperBuilderCustomizer longToStringCustomizer() {
  return builder -> builder.serializerByType(Long.class, ToStringSerializer.instance);
}`;

  // ── Section 9: 多态序列化 ────────────────────────────────────────────────────

  const polyCode = `// 场景：消息体有多种类型，前端根据 type 字段判断结构

// Java 端：抽象基类 + 多个子类
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = TextMessage.class, name = "text"),
    @JsonSubTypes.Type(value = ImageMessage.class, name = "image"),
    @JsonSubTypes.Type(value = VoiceMessage.class, name = "voice")
})
public abstract class Message {
  private Long id;
  private Long fromUserId;
  // ...
}

public class TextMessage  extends Message { private String text; }
public class ImageMessage extends Message { private String url; private Integer width; private Integer height; }
public class VoiceMessage extends Message { private Integer duration; }

// 序列化：自动加 type字段
// {"type":"text","id":1,"fromUserId":100,"text":"hello"}
// {"type":"image","id":2,"fromUserId":100,"url":"...","width":800,"height":600}

// 反序列化：根据 type 自动选对应子类
Message msg = mapper.readValue(json, Message.class);
if (msg instanceof TextMessage tm) {
  System.out.println(tm.getText());
}

// 前端等价写法（discriminated union）：
// type Message = { type: 'text'; text: string } | { type: 'image'; url: string } | ...`;

  // ── Section 10: 性能优化 ────────────────────────────────────────────────────

  const perfCode = `// ① ObjectMapper 是线程安全的，应该复用，不要每次 new
// ❌ 每次创建
public String toJson(User u) {
  return new ObjectMapper().writeValueAsString(u);  // 慢 10-100 倍
}

// ✅ 复用单例
private static final ObjectMapper MAPPER = new ObjectMapper();
public String toJson(User u) throws JsonProcessingException {
  return MAPPER.writeValueAsString(u);
}

// ② 使用字节流而非字符串（大对象场景）
// writeValueAsString 会多一份 String 内存副本
mapper.writeValue(outputStream, bigObject);     // 直接写流，省内存
BigObject obj = mapper.readValue(inputStream, BigObject.class);

// ③ 开启 Afterburner/Blackbird 模块（提升 30% 序列化速度）
// 通过字节码生成代替反射
<dependency>
  <groupId>com.fasterxml.jackson.module</groupId>
  <artifactId>jackson-module-blackbird</artifactId>
</dependency>
mapper.registerModule(new BlackbirdModule());

// ④ 禁用不用的特性
mapper.disable(SerializationFeature.INDENT_OUTPUT);    // 不要格式化（生产环境）
mapper.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

// ⑤ 树模型（JsonNode）：只取几个字段时比映射成对象快
JsonNode root = mapper.readTree(json);
Long id = root.get("id").asLong();
String name = root.get("name").asText();
// 不需要构造完整的 User 对象`;

  // ── Section 11: 常见踩坑 ────────────────────────────────────────────────────

  const pitfallRows = [
    ['Long 精度丢失',         '⚠️ 高频',  'Java Long 最大 2^63-1，JS Number 最大安全整数 2^53-1。雪花算法生成的 ID 超 2^53 会丢精度，前端拿到错误 ID。解决：Long 序列化为 String'],
    ['循环引用 StackOverflow','⚠️ 高频',  '双向关联（Order↔User）序列化时互相调用 getter 导致栈溢出。解决：加 @JsonIgnore，或用 @JsonManagedReference/@JsonBackReference 配对'],
    ['未知字段反序列化失败',   '⚠️ 中频',  '默认 FAIL_ON_UNKNOWN_PROPERTIES=true，前端多传字段会 400。Spring Boot 已默认关闭，自定义 ObjectMapper 时记得关'],
    ['LocalDateTime 序列化报错','⚠️ 中频', '默认不支持 JSR-310 时间类型，需注册 JavaTimeModule。Spring Boot 自动注册，自建 ObjectMapper 要手动 mapper.registerModule(new JavaTimeModule())'],
    ['无参构造缺失',          '⚠️ 中频',  '反序列化需要无参构造器 + setter。@Data 不生成无参构造，需补 @NoArgsConstructor。Jackson 不会用全参构造（除非 @JsonCreator）'],
    ['时区错乱',              '⚠️ 中频',  '默认 UTC，导致北京时间差 8 小时。全局设置 spring.jackson.time-zone: GMT+8，或字段 @JsonFormat(timezone = "GMT+8")'],
    ['null vs 缺失字段',      '⚠️ 中频',  '默认 null 字段也输出（{"name":null}）。前端解构会拿到 undefined，但接口体积变大。加 @JsonInclude(NON_NULL) 省流量'],
    ['空对象报错',            '⚠️ 低频',  '默认 FAIL_ON_EMPTY_BEANS=true，对象没有任何可序列化字段时抛异常。配置 serialization.fail-on-empty-beans: false 关闭'],
    ['枚举反序列化大小写',     '⚠️ 低频',  '前端传 "VIP" 而枚举是 "VIP" 能匹配；传 "vip" 则失败。需自定义 JsonDeserializer 或用 @JsonCreator 做大小写兼容'],
    ['BigDecimal 精度',       '⚠️ 低频',  '默认序列化为 number，前端可能丢精度。金融场景建议序列化为 String：@JsonSerialize(using = ToStringSerializer.class)'],
  ];
  const pitfallTable = compareCard(pitfallRows, ['问题', '频率', '原因与解决']);

  const longPrecisionBox = ruleBox('danger',
    `<strong>最高频踩坑：Long 精度丢失。</strong><br>
    雪花算法 ID（如 <code>1234567890123456789</code>）超过 JS 安全整数 <code>9007199254740991</code>，<br>
    前端 <code>JSON.parse</code> 后变成 <code>1234567890123456800</code>，差了几十甚至上百。<br><br>
    <strong>解决：</strong>全局把 Long 序列化为 String：
    <pre style="margin-top:6px"><code>@Bean
public Jackson2ObjectMapperBuilderCustomizer longToString() {
  return b -> b.serializerByType(Long.class, ToStringSerializer.instance)
              .serializerByType(Long.TYPE, ToStringSerializer.instance);
}</code></pre>
    这样所有 <code>Long</code> 字段输出为 <code>"1234567890123456789"</code>（带引号），前端按字符串处理不会丢精度。`);

  // ── Section 12: 树模型 JsonNode ─────────────────────────────────────────────

  const treeCode = `// 不需要完整映射成对象，只想取几个字段时用 JsonNode

String json = "{\\"id\\":1,\\"user\\":{\\"name\\":\\"Tom\\"},\\"tags\\":[\\"a\\",\\"b\\"]}";

JsonNode root = mapper.readTree(json);

// 取字段
long id   = root.get("id").asLong();              // 1
String name = root.path("user").get("name").asText();  // Tom
// path vs get：path 不存在返回 MissingNode，get 返回 null

// 取数组
List<String> tags = new ArrayList<>();
root.get("tags").forEach(node -> tags.add(node.asText()));

// 判断类型
if (root.get("id").isNumber()) { ... }
if (root.has("user")) { ... }

// 修改并写回
ObjectNode obj = (ObjectNode) root;
obj.put("id", 999);
obj.put("extra", "added");
String newJson = mapper.writeValueAsString(obj);

// 前端等价写法：
// const root = JSON.parse(json);
// const id = root.id;
// const name = root.user?.name;
// const tags = root.tags ?? [];`;

  // ── Section 13: 前端类比速查 ───────────────────────────────────────────────

  const feRows = [
    ['JSON.stringify',         'writeValueAsString',          '对象 → JSON 字符串'],
    ['JSON.parse',             'readValue',                   'JSON 字符串 → 对象'],
    ['JSON.parse 中的 reviver','自定义 JsonDeserializer',     '解析时自定义转换逻辑'],
    ['JSON.stringify replacer','自定义 JsonSerializer',       '序列化时自定义输出'],
    ['replacer 函数过滤字段',   '@JsonIgnore / @JsonInclude',  '控制哪些字段输出'],
    ['字段名转换（手动）',      '@JsonProperty / @JsonNaming', '统一改名策略'],
    ['TS discriminated union','@JsonTypeInfo + @JsonSubTypes','多态序列化'],
    ['optional chaining ?.',  'JsonNode.path()',              '安全访问嵌套字段，不存在返回空节点'],
    ['Date.toJSON()',         '@JsonFormat',                  '日期格式化控制'],
    ['Bigint 序列化为字符串',   'Long → String 序列化',         '避免精度丢失'],
  ];
  const feTable = compareCard(feRows, ['前端', 'Jackson', '本质类比']);

  // ── Section 14: 依赖与版本 ──────────────────────────────────────────────────

  const depCode = `// Spring Boot 项目：无需单独引入，spring-boot-starter-web 已包含
// spring-boot-starter-web → spring-boot-starter-json → jackson-databind + jackson-core + jackson-annotations

// Spring Boot BOM 已管理版本，不写 <version>
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
</dependency>

// 非 Spring Boot 项目，需显式声明版本
<dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>2.17.2</version>
</dependency>

// JSR-310 时间类型支持（Spring Boot 自动包含）
<dependency>
  <groupId>com.fasterxml.jackson.datatype</groupId>
  <artifactId>jackson-datatype-jsr310</artifactId>
</dependency>

// 三个核心包的关系：
// jackson-core      → 流式 API（JsonParser / JsonGenerator）
// jackson-databind  → ObjectMapper + 树模型 + 注解绑定（依赖 core + annotations）
// jackson-annotations → 只放注解定义（@JsonProperty 等），最轻量`;

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('快速上手', quickPair)}
    ${section('核心注解全览', annotationTable)}
    ${section('字段重命名实战（camelCase ↔ snake_case）', codeBlock('三种重命名方式对比', 'dot-blue', 'java', renameCode))}
    ${section('忽略与空值控制', codeBlock('@JsonIgnore 与 @JsonInclude', 'dot-orange', 'java', ignoreCode))}
    ${section('日期处理（最容易踩坑）', codeBlock('日期格式化的三种方式', 'dot-yellow', 'java', dateCode))}
    ${section('反序列化与泛型', codeBlock('readValue 各种姿势', 'dot-blue', 'java', deserCode))}
    ${section('Spring Boot 自动配置', springBox + codeBlock('Spring Boot 中的正确用法', 'dot-green', 'java', springCode))}
    ${section('自定义序列化器', codeBlock('金额转换 / Long 转字符串', 'dot-orange', 'java', customCode))}
    ${section('多态序列化', codeBlock('基于 type 字段的多态', 'dot-blue', 'java', polyCode))}
    ${section('树模型 JsonNode', codeBlock('只取部分字段的快速方案', 'dot-blue', 'java', treeCode))}
    ${section('性能优化', codeBlock('复用 / 流式 / 字节码加速', 'dot-orange', 'java', perfCode))}
    ${section('常见踩坑', pitfallTable + longPrecisionBox)}
    ${section('前端类比速查', feTable)}
    ${section('依赖与版本', codeBlock('Maven 依赖配置', 'dot-blue', 'xml', depCode))}`);
}
