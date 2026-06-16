function renderSpringMvcFlow(t) {
  const conclusion = ruleBox('info',
    `<strong>Spring MVC = 一套把 HTTP 请求路由到 Java 方法、把返回值序列化为 JSON 的框架。</strong><br><br>
    前端类比：相当于 <strong>Express.js</strong> 的路由系统——<code>app.get('/users', handler)</code> 对应 Java 的 <code>@GetMapping("/users")</code>。<br>
    核心入口是 <code>DispatcherServlet</code>，它是所有 HTTP 请求的"总调度员"，负责找到对应的 Controller 方法并调用。`);

  // ── Section 1: 请求全流程 ─────────────────────────────────────────────────────

  const flowCode = `// HTTP 请求的完整生命周期（Spring MVC）
//
// ① 客户端 → DispatcherServlet（前端控制器，所有请求的入口）
//
// ② DispatcherServlet → HandlerMapping
//      "这个 URL + 方法 对应哪个 Controller 方法？"
//      比如：GET /api/users/123 → UserController.getUser(Long id)
//
// ③ DispatcherServlet → HandlerAdapter
//      调用 Controller 方法，传入参数（从 URL / 请求体 / Header 解析）
//
// ④ Controller 执行业务逻辑，返回数据对象（如 UserDTO）
//
// ⑤ HandlerAdapter → MessageConverter（消息转换器）
//      把 Java 对象序列化为 JSON（Jackson：UserDTO → {"id":123,"name":"Alice"}）
//
// ⑥ DispatcherServlet → 客户端
//      返回 HTTP Response（状态码 + JSON Body）
//
// ─────────────────────────────────────────────────────────────────
// 前端类比（Express.js 对应关系）：
//
// DispatcherServlet  ←→  app（Express 应用实例）
// HandlerMapping     ←→  路由表（router.get/post...）
// @RequestMapping    ←→  app.get('/path', handler)
// @RequestBody       ←→  req.body（需要 express.json() 中间件）
// @PathVariable      ←→  req.params.id
// @RequestParam      ←→  req.query.page
// ResponseEntity     ←→  res.status(200).json({...})
// @ControllerAdvice  ←→  app.use((err, req, res, next) => {...}) 全局错误处理`;

  // ── Section 2: @RestController 注解速查 ─────────────────────────────────────

  const annotationRows = [
    ['@RestController',       '@Controller + @ResponseBody', '声明这是 REST API Controller，返回值自动序列化为 JSON'],
    ['@RequestMapping("/api")', '类级路由前缀',              '为类下所有方法加 URL 前缀，避免每个方法重复写'],
    ['@GetMapping("/users")',  'GET 请求映射',               '等价于 @RequestMapping(method = GET)，推荐简写'],
    ['@PostMapping',          'POST 请求映射',               '同上，对应 POST'],
    ['@PathVariable',         '路径参数',                    '/users/{id} 中的 {id}，对应 Express 的 req.params'],
    ['@RequestParam',         'Query 参数',                  '/users?page=1 中的 page，对应 req.query'],
    ['@RequestBody',          '请求体（JSON）',               '自动把 JSON 反序列化为 Java 对象，对应 req.body'],
    ['@RequestHeader',        '请求头',                      '获取特定 Header 值，如 Authorization'],
  ];
  const annotationTable = compareCard(annotationRows, ['注解', '作用']);

  // ── Section 3: 完整 Controller 示例 ─────────────────────────────────────────

  const controllerCode = `@RestController
@RequestMapping("/api/users")      // 所有接口的 URL 前缀
public class UserController {

  @Autowired
  private UserService userService;

  // GET /api/users/123
  @GetMapping("/{id}")
  public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
    UserDTO user = userService.findById(id);
    if (user == null) {
      return ResponseEntity.notFound().build();    // HTTP 404
    }
    return ResponseEntity.ok(user);               // HTTP 200 + JSON body
  }

  // GET /api/users?page=1&size=20&keyword=alice
  @GetMapping
  public ResponseEntity<PageResult<UserDTO>> listUsers(
      @RequestParam(defaultValue = "1")  int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(required = false)    String keyword) {
    PageResult<UserDTO> result = userService.search(page, size, keyword);
    return ResponseEntity.ok(result);
  }

  // POST /api/users
  @PostMapping
  public ResponseEntity<UserDTO> createUser(@RequestBody @Valid CreateUserRequest req) {
    // @Valid：触发 Bean Validation（@NotNull / @Size / @Email 等校验注解）
    UserDTO created = userService.create(req);
    return ResponseEntity.status(HttpStatus.CREATED).body(created); // HTTP 201
  }

  // PUT /api/users/123
  @PutMapping("/{id}")
  public ResponseEntity<UserDTO> updateUser(
      @PathVariable Long id,
      @RequestBody @Valid UpdateUserRequest req) {
    UserDTO updated = userService.update(id, req);
    return ResponseEntity.ok(updated);
  }

  // DELETE /api/users/123
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
    userService.delete(id);
    return ResponseEntity.noContent().build(); // HTTP 204
  }
}`;

  // ── Section 4: 统一异常处理 ───────────────────────────────────────────────────

  const exceptionHandlerCode = `// @ControllerAdvice = 全局异常处理器
// 类比 Express 的 app.use((err, req, res, next) => {...})
@RestControllerAdvice  // @ControllerAdvice + @ResponseBody
public class GlobalExceptionHandler {

  // 处理业务异常（自定义异常）
  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)          // HTTP 400
        .body(new ErrorResponse(e.getCode(), e.getMessage()));
  }

  // 处理参数校验失败（@Valid 触发）
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidation(
      MethodArgumentNotValidException e) {
    String message = e.getBindingResult()
        .getFieldErrors()
        .stream()
        .map(err -> err.getField() + ": " + err.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse("VALIDATION_FAILED", message));
  }

  // 兜底：处理所有未预期的异常
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
    log.error("未预期异常", e);
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR) // HTTP 500
        .body(new ErrorResponse("INTERNAL_ERROR", "服务器内部错误"));
  }
}

// 统一响应结构
public record ErrorResponse(String code, String message) {}`;

  const twoCode = codeBlocksRow([
    codeBlock('完整 REST Controller', 'dot-orange', 'java', controllerCode),
    codeBlock('@ControllerAdvice 全局异常处理', 'dot-red', 'java', exceptionHandlerCode),
  ]);

  // ── Section 5: 前端 vs Java 请求处理 ─────────────────────────────────────────

  const expressCode = `// Express.js
const router = express.Router();

// GET /api/users/:id
router.get('/users/:id', async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  res.json(user);  // 自动序列化为 JSON
});

// POST /api/users
router.post('/users', validateBody(createUserSchema), async (req, res) => {
  const created = await userService.create(req.body);
  res.status(201).json(created);
});

// 全局错误处理（4 个参数的中间件）
app.use((err, req, res, next) => {
  if (err instanceof BusinessError) {
    return res.status(400).json({ code: err.code, message: err.message });
  }
  res.status(500).json({ message: 'Internal Server Error' });
});`;

  const fePair = codeBlocksRow([
    codeBlock('前端：Express.js 路由', 'dot-blue', 'typescript', expressCode),
    codeBlock('Java：Spring MVC Controller（见上方完整示例）', 'dot-orange', 'java',
`// 核心对应关系：
// router.get('/users/:id', handler)
//   ↕
// @GetMapping("/{id}")  +  @PathVariable Long id
//
// req.body  →  @RequestBody @Valid CreateUserRequest req
// req.params.id  →  @PathVariable Long id
// req.query.page  →  @RequestParam int page
//
// res.status(201).json(data)
//   ↕
// ResponseEntity.status(CREATED).body(data)
//
// app.use((err, req, res, next) => {...})
//   ↕
// @RestControllerAdvice + @ExceptionHandler`),
  ]);

  // ── Section 6: ResponseEntity 常用状态码 ─────────────────────────────────────

  const statusRows = [
    ['ResponseEntity.ok(body)',                    '200 OK',          '查询 / 更新成功，返回数据'],
    ['ResponseEntity.status(CREATED).body(body)',  '201 Created',     'POST 新建资源成功'],
    ['ResponseEntity.noContent().build()',         '204 No Content',  'DELETE 成功，无返回体'],
    ['ResponseEntity.badRequest().body(err)',      '400 Bad Request', '参数错误 / 业务校验失败'],
    ['ResponseEntity.notFound().build()',          '404 Not Found',   '资源不存在'],
    ['ResponseEntity.status(500).body(err)',       '500 Internal',    '服务器未预期错误'],
  ];
  const statusTable = compareCard(statusRows, ['Java 写法', 'HTTP 状态码']);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('HTTP 请求全流程', codeBlock('请求生命周期（带前端类比）', 'dot-blue', 'plaintext', flowCode))}
    ${section('常用注解速查', annotationTable)}
    ${section('完整代码示例 + 全局异常处理', twoCode)}
    ${section('与 Express.js 对比', fePair)}
    ${section('ResponseEntity 状态码速查', statusTable)}`);
}
