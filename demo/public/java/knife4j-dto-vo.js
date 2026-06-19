function renderKnife4jDtoVo(t) {
  // ── Section 1：结论 ────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>DTO/VO 分层和 Knife4j 解决同一个问题：让接口契约清晰、安全、可维护。</strong><br><br>
    ① <strong>Entity</strong>：对应数据库表，字段跟列一一对应，不暴露给外部；<br>
    ② <strong>DTO（Data Transfer Object）</strong>：接收前端请求入参，含校验注解，不含敏感字段；<br>
    ③ <strong>VO（View Object）</strong>：返回给前端的响应体，字段按展示需求裁剪和组合；<br>
    ④ <strong>Knife4j</strong>：在 Swagger 基础上增强的 API 文档工具，通过注解自动生成可交互文档。<br><br>
    前端类比：DTO ≈ 表单 Schema（入参校验）；VO ≈ 接口响应的 TypeScript 类型定义；Knife4j ≈ Swagger UI / Postman 文档。`);

  // ── Section 2：分层架构对比 ─────────────────────────────────────────────────

  const layerCompareTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">对象类型</div>
        <div class="compare-card-header-cell java">所在层</div>
        <div class="compare-card-header-cell desc">职责 / 典型字段</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>Entity</code></div>
        <div class="compare-card-cell java">持久层（Mapper）</div>
        <div class="compare-card-cell desc">与数据库列一一对应，含 <code>password</code>、<code>is_deleted</code> 等内部字段</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>DTO</code></div>
        <div class="compare-card-cell java">Controller → Service</div>
        <div class="compare-card-cell desc">前端传入的参数，含 <code>@NotNull</code> 等校验注解，无 id / 时间戳</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>VO</code></div>
        <div class="compare-card-cell java">Service → Controller → 前端</div>
        <div class="compare-card-cell desc">返回给前端的视图数据，可含多表聚合字段，无密码等敏感信息</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>Query</code>（可选）</div>
        <div class="compare-card-cell java">Controller → Service</div>
        <div class="compare-card-cell desc">分页/过滤查询条件，如 <code>pageNum</code>、<code>keyword</code>、<code>status</code></div>
      </div>
    </div>`;

  const layerFlowCode = `// 数据流向：前端请求 → Controller → Service → Mapper → 数据库
//                                  ↓ DTO           ↓ Entity
//           前端响应 ← Controller ← Service ← Mapper ← 数据库
//                          ↑ VO

// ① Controller 接收 DTO（前端入参）
@PostMapping("/users")
public Result<UserVO> createUser(@RequestBody @Validated UserCreateDTO dto) {
    UserVO vo = userService.createUser(dto);
    return Result.ok(vo);
}

// ② Service 将 DTO → Entity 存库，Entity → VO 返回
public UserVO createUser(UserCreateDTO dto) {
    User entity = new User();
    BeanUtils.copyProperties(dto, entity);  // DTO → Entity
    userMapper.insert(entity);

    UserVO vo = new UserVO();
    BeanUtils.copyProperties(entity, vo);   // Entity → VO
    return vo;
}`;

  const layerFlowBlock = codeBlock('数据流向示意', 'dot-blue', 'java', layerFlowCode);

  // ── Section 3：DTO ─────────────────────────────────────────────────────────

  const dtoCode = `// UserCreateDTO：用户注册入参
@Data
public class UserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Length(min = 3, max = 20, message = "用户名长度 3-20")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Length(min = 6, max = 30, message = "密码长度 6-30")
    private String password;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String email;

    @NotNull(message = "年龄不能为空")
    @Min(value = 1, message = "年龄不能小于 1")
    @Max(value = 150, message = "年龄不能大于 150")
    private Integer age;
}

// UserUpdateDTO：更新入参（字段可选，与 Create 分离）
@Data
public class UserUpdateDTO {

    @NotNull(message = "用户 ID 不能为空")
    private Long id;

    @Length(max = 20, message = "昵称不超过 20 字")
    private String nickname;   // 只允许改昵称，不允许改用户名和密码

    @Email(message = "邮箱格式不正确")
    private String email;
}`;

  const dtoValidationCode = `// Controller 中开启校验：@Validated 触发 DTO 字段校验
@PostMapping("/users")
public Result<UserVO> createUser(@RequestBody @Validated UserCreateDTO dto) {
    // 如果 DTO 字段校验失败，Spring 自动抛 MethodArgumentNotValidException
    // 由全局异常处理器捕获，返回 400 + 错误信息
    return Result.ok(userService.createUser(dto));
}

// 全局异常处理器：统一处理校验失败
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult()
                       .getFieldErrors()
                       .stream()
                       .map(FieldError::getDefaultMessage)
                       .collect(Collectors.joining("; "));
        return Result.fail(400, msg);
        // → {"code": 400, "msg": "用户名不能为空; 邮箱格式不正确"}
    }
}`;

  const dtoJsCode = `// 前端类比：DTO ≈ 表单 Schema + 校验规则

// Zod schema（TypeScript）
const UserCreateSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6).max(30),
  email:    z.string().email(),
  age:      z.number().int().min(1).max(150),
});

// React Hook Form + Zod
const { register, handleSubmit } = useForm({
  resolver: zodResolver(UserCreateSchema),
});

// 结论：
// Java DTO @NotBlank/@Email = Zod z.string().email()
// @Validated = resolver: zodResolver(schema)
// 全局异常处理器 = axios 响应拦截器统一处理 400 错误`;

  const dtoPair = codeBlocksRow([
    codeBlock('UserCreateDTO / UserUpdateDTO', 'dot-blue', 'java', dtoCode),
    codeBlock('Controller 校验 + 全局异常处理', 'dot-green', 'java', dtoValidationCode),
  ]);

  const dtoJsBlock = codeBlock('前端类比：Zod Schema', 'dot-orange', 'javascript', dtoJsCode);

  const dtoNote = ruleBox('success',
    `<strong>为什么 Create 和 Update 要分两个 DTO？</strong><br>
    创建时 id 不存在（由数据库生成），更新时 id 必填；
    创建时 password 必填，更新通常不允许改密码；
    两个操作的必填字段不同，合并成一个 DTO 只能把所有字段都改成可选，导致校验失效。<br><br>
    <strong>命名约定：</strong><code>XxxCreateDTO</code>、<code>XxxUpdateDTO</code>、<code>XxxQueryDTO</code>（分页查询条件）。`);

  // ── Section 4：VO ──────────────────────────────────────────────────────────

  const voCode = `// UserVO：返回给前端的用户视图
@Data
public class UserVO {

    private Long   id;
    private String username;
    private String nickname;
    private String email;
    private Integer age;
    private String  avatarUrl;

    // 聚合字段：来自其他表，Entity 中没有
    private Integer orderCount;    // 订单数，来自 orders 表
    private String  levelName;     // 会员等级名称，来自 level 表

    // 脱敏处理：隐藏手机号中间 4 位（不暴露原始值）
    private String  phone;         // 展示为 "138****5678"

    // 注意：password、isDeleted、salt 等字段不出现在 VO 中
}

// 列表场景用精简 VO，避免传输冗余数据
@Data
public class UserSimpleVO {
    private Long   id;
    private String username;
    private String avatarUrl;
}`;

  const voConvertCode = `// Entity → VO 的转换方式

// 方式一：BeanUtils.copyProperties（快速但不安全）
UserVO vo = new UserVO();
BeanUtils.copyProperties(entity, vo);
// ⚠️ 同名字段自动复制，字段类型不匹配时抛异常或静默跳过
// ⚠️ 复制了不该暴露的字段（如 password）——需要手动置空

// 方式二：手动赋值（最安全，IDE 可重构）
UserVO vo = new UserVO();
vo.setId(entity.getId());
vo.setUsername(entity.getUsername());
vo.setEmail(entity.getEmail());
// 只设需要的字段，password 自然不会出现

// 方式三：MapStruct（推荐，编译期生成代码，类型安全）
@Mapper(componentModel = "spring")
public interface UserConverter {

    @Mapping(target = "levelName", ignore = true)  // 聚合字段单独处理
    UserVO toVO(User entity);

    @Mapping(target = "id",        ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    User toEntity(UserCreateDTO dto);
}

// 使用：Spring 注入 converter
@Autowired
private UserConverter userConverter;

UserVO vo = userConverter.toVO(entity);  // 编译期生成，运行期无反射开销`;

  const voPair = codeBlocksRow([
    codeBlock('UserVO 设计', 'dot-blue', 'java', voCode),
    codeBlock('Entity → VO 三种转换方式', 'dot-green', 'java', voConvertCode),
  ]);

  const voNote = ruleBox('warning',
    `<strong>VO 设计原则：</strong><br><br>
    <strong>① 最小暴露</strong>：只包含前端真正需要的字段，<code>password</code>、<code>salt</code>、<code>is_deleted</code> 永远不出现在 VO 中<br>
    <strong>② 接口稳定</strong>：数据库加列时 Entity 变化，VO 不变，前端不感知；前端要新字段时只改 VO，不动 Entity<br>
    <strong>③ 列表 vs 详情分 VO</strong>：列表页用 <code>XxxSimpleVO</code>（精简字段），详情页用 <code>XxxVO</code>（完整字段），减少网络传输<br>
    <strong>④ 统一响应体</strong>：用 <code>Result&lt;T&gt;</code> 包装 VO，统一 <code>{"code":200,"msg":"ok","data":{...}}</code> 格式`);

  // ── Section 5：Knife4j ────────────────────────────────────────────────────

  const knife4jDepCode = `<!-- pom.xml：引入 Knife4j（整合了 Swagger 3 + 增强 UI） -->
<dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
    <version>4.4.0</version>
</dependency>

<!-- application.yml：基本配置 -->`;

  const knife4jYamlCode = `# application.yml
springdoc:
  swagger-ui:
    path: /swagger-ui.html    # 原始 Swagger UI 地址
  api-docs:
    path: /v3/api-docs

knife4j:
  enable: true
  setting:
    language: zh_CN           # 界面语言
  # 访问地址：http://localhost:8080/doc.html`;

  const knife4jAnnotationCode = `// Controller 注解：描述接口
@Tag(name = "用户管理", description = "用户注册、查询、更新相关接口")
@RestController
@RequestMapping("/api/users")
public class UserController {

    // @Operation：描述单个接口
    @Operation(summary = "创建用户", description = "注册新用户，用户名唯一")
    @PostMapping
    public Result<UserVO> createUser(
            // @RequestBody 的 DTO 自动展示字段说明
            @RequestBody @Validated UserCreateDTO dto) {
        return Result.ok(userService.createUser(dto));
    }

    @Operation(summary = "查询用户详情")
    @Parameter(name = "id", description = "用户 ID", required = true, example = "1")
    @GetMapping("/{id}")
    public Result<UserVO> getUser(@PathVariable Long id) {
        return Result.ok(userService.getById(id));
    }

    @Operation(summary = "分页查询用户列表")
    @GetMapping
    public Result<Page<UserSimpleVO>> listUsers(
            @Parameter(description = "页码，从 1 开始") @RequestParam(defaultValue = "1")  int pageNum,
            @Parameter(description = "每页条数")         @RequestParam(defaultValue = "10") int pageSize,
            @Parameter(description = "关键词搜索")       @RequestParam(required = false) String keyword) {
        return Result.ok(userService.listUsers(pageNum, pageSize, keyword));
    }
}`;

  const knife4jDtoAnnoCode = `// DTO 注解：描述请求体字段（Knife4j 自动生成表单）
@Data
@Schema(description = "用户创建请求体")
public class UserCreateDTO {

    @Schema(description = "用户名", example = "alice", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "用户名不能为空")
    private String username;

    @Schema(description = "密码（6-30位）", example = "123456")
    @NotBlank @Length(min = 6, max = 30)
    private String password;

    @Schema(description = "邮箱", example = "alice@example.com")
    @NotBlank @Email
    private String email;
}

// VO 注解：描述响应体字段
@Data
@Schema(description = "用户信息响应体")
public class UserVO {

    @Schema(description = "用户 ID")
    private Long id;

    @Schema(description = "用户名")
    private String username;

    @Schema(description = "脱敏手机号", example = "138****5678")
    private String phone;
}`;

  const knife4jDepBlock = codeBlock('Maven 依赖', 'dot-blue', 'xml', knife4jDepCode);
  const knife4jYamlBlock = codeBlock('application.yml 配置', 'dot-orange', 'yaml', knife4jYamlCode);

  const knife4jPair = codeBlocksRow([
    codeBlock('Controller 注解（@Tag / @Operation / @Parameter）', 'dot-green', 'java', knife4jAnnotationCode),
    codeBlock('DTO / VO 注解（@Schema）', 'dot-blue', 'java', knife4jDtoAnnoCode),
  ]);

  const knife4jNote = ruleBox('success',
    `<strong>Knife4j 注解速查：</strong><br>
    <code>@Tag(name="...")</code> → 接口分组（加在 Controller 类上）<br>
    <code>@Operation(summary="...")</code> → 接口描述（加在方法上）<br>
    <code>@Parameter(description="...")</code> → 路径参数 / Query 参数说明（加在参数上）<br>
    <code>@Schema(description="...")</code> → DTO/VO 字段说明（加在字段上）<br><br>
    <strong>访问地址：</strong><code>http://localhost:8080/doc.html</code>（Knife4j 增强 UI）<br>
    <code>http://localhost:8080/swagger-ui/index.html</code>（原生 Swagger UI）`);

  // ── Section 5b：OpenAPI 配置类 + JWT 鉴权 ─────────────────────────────────

  const openApiConfigCode = `import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.*;
import io.swagger.v3.oas.models.security.*;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.*;

@Configuration
public class Knife4jConfig {

  // 全局文档信息（显示在 doc.html 顶部）
  @Bean
  public OpenAPI openAPI() {
    return new OpenAPI()
      .info(new Info()
        .title("My Project API")
        .description("接口文档 - 开发环境")
        .version("v1.0.0")
        .contact(new Contact().name("Phil").email("phil@example.com")))
      // 全局安全方案：JWT Bearer Token
      .addSecurityItem(new SecurityRequirement().addList("JWT"))
      .components(new Components()
        .addSecuritySchemes("JWT", new SecurityScheme()
          .name("JWT")
          .type(SecurityScheme.Type.HTTP)
          .scheme("bearer")
          .bearerFormat("JWT")
          .description("在此输入 token，格式：直接粘贴 token 字符串（不加 Bearer 前缀）")));
  }

  // 接口分组：按模块拆分（可选，单模块项目可不配置）
  @Bean
  public GroupedOpenApi userApi() {
    return GroupedOpenApi.builder()
      .group("用户模块")
      .pathsToMatch("/api/users/**")
      .build();
  }

  @Bean
  public GroupedOpenApi orderApi() {
    return GroupedOpenApi.builder()
      .group("订单模块")
      .pathsToMatch("/api/orders/**")
      .build();
  }
}`;

  const knife4jProdCode = `# application-prod.yml（生产环境关闭文档，防止接口信息泄露）
springdoc:
  api-docs:
    enabled: false    # 关闭 /v3/api-docs 端点

knife4j:
  enable: false       # 关闭 Knife4j UI

# application-dev.yml（开发环境正常开启）
springdoc:
  api-docs:
    enabled: true
knife4j:
  enable: true
  setting:
    language: zh_CN

# Spring Security 需放行文档路径（否则 doc.html 返回 401）
# SecurityConfig.java 中：
# .requestMatchers(
#     "/doc.html",
#     "/v3/api-docs/**",
#     "/swagger-ui/**",
#     "/swagger-resources/**",
#     "/webjars/**"
# ).permitAll()`;

  const knife4jJwtUsageBox = ruleBox('info',
    `<strong>在 doc.html 中调试需要鉴权的接口：</strong><br><br>
    1. 先调用登录接口（<code>POST /api/auth/login</code>），从响应中复制 token 值<br>
    2. 点击右上角 <strong>「Authorize 🔓」</strong> 按钮<br>
    3. 在弹窗中粘贴 token（直接粘贴，<strong>不加 Bearer 前缀</strong>，Knife4j 自动添加）<br>
    4. 点击 Authorize → 再调其他接口，请求头会自动带上 <code>Authorization: Bearer xxx</code><br><br>
    前端类比：等价于在 Postman 的 <strong>Collection Variables</strong> 中设置 token，之后所有请求自动引用。`);

  const openApiPair = codeBlocksRow([
    codeBlock('Knife4jConfig.java — OpenAPI 配置 + JWT 鉴权', 'dot-orange', 'java', openApiConfigCode),
    codeBlock('生产环境关闭文档 / Security 放行', 'dot-yellow', 'yaml', knife4jProdCode),
  ]);

  // ── Section 6：统一响应体 ─────────────────────────────────────────────────

  const resultCode = `// 统一响应体 Result<T>：所有接口都用这个包装返回值
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Result<T> {

    private Integer code;   // 200 成功，400 参数错误，401 未认证，500 服务错误
    private String  msg;
    private T       data;

    public static <T> Result<T> ok(T data) {
        return new Result<>(200, "ok", data);
    }

    public static <T> Result<T> ok() {
        return new Result<>(200, "ok", null);
    }

    public static <T> Result<T> fail(int code, String msg) {
        return new Result<>(code, msg, null);
    }
}

// 使用示例
// 成功：{"code":200,"msg":"ok","data":{"id":1,"username":"alice"}}
// 失败：{"code":400,"msg":"用户名不能为空","data":null}
// 500： {"code":500,"msg":"服务器内部错误","data":null}`;

  const resultJsCode = `// 前端 axios 拦截器：统一处理响应体
axios.interceptors.response.use(
  response => {
    const { code, msg, data } = response.data;
    if (code === 200) return data;           // 直接返回 data 字段
    if (code === 401) router.push('/login'); // 未登录跳转
    return Promise.reject(new Error(msg));   // 业务错误统一抛出
  },
  error => {
    message.error('网络错误');
    return Promise.reject(error);
  }
);

// 使用时：接口返回已经是 data 字段的内容
const user = await api.getUser(1);  // UserVO 对象，不是 Result<UserVO>

// TypeScript 类型定义
interface Result<T> {
  code: number;
  msg:  string;
  data: T;
}
interface UserVO {
  id:       number;
  username: string;
  phone:    string;
}`;

  const resultPair = codeBlocksRow([
    codeBlock('Result<T> 统一响应体', 'dot-blue', 'java', resultCode),
    codeBlock('前端 axios 拦截器 + TS 类型', 'dot-orange', 'javascript', resultJsCode),
  ]);

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('分层架构：Entity / DTO / VO', layerCompareTable + layerFlowBlock)}
    ${section('DTO — 入参校验', dtoPair + dtoJsBlock + dtoNote)}
    ${section('VO — 响应视图', voPair + voNote)}
    ${section('Knife4j — API 文档', knife4jDepBlock + knife4jYamlBlock + knife4jPair + knife4jNote)}
    ${section('Knife4j — OpenAPI 配置与 JWT 鉴权调试', openApiPair + knife4jJwtUsageBox)}
    ${section('统一响应体 Result<T>', resultPair)}`);
}
