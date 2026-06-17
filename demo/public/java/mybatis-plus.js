function renderMybatisPlus(t) {
  // ── Section 1：结论 ────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>MyBatis-Plus 是 MyBatis 的增强工具包，在不改变任何 MyBatis 行为的基础上，提供：</strong><br><br>
    ① <strong>BaseMapper&lt;T&gt;</strong>：内置 CRUD 方法，单表操作无需写 XML；<br>
    ② <strong>分页插件（PaginationInnerInterceptor）</strong>：一行注解完成物理分页，自动生成 COUNT + LIMIT SQL；<br>
    ③ <strong>逻辑删除</strong>：<code>@TableLogic</code> 让 DELETE 变成 UPDATE，查询自动过滤已删除行。<br><br>
    MyBatis-Plus 与 MyBatis 共存，原有 XML Mapper 全部继续有效，可以按需混用。`);

  // ── Section 2：分页插件 ────────────────────────────────────────────────────

  const paginationConfigCode = `// Spring Boot 配置类：注册分页插件
@Configuration
public class MyBatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        // 指定数据库类型（影响 LIMIT 语法：MySQL 用 LIMIT，Oracle 用 ROWNUM）
        interceptor.addInnerInterceptor(
            new PaginationInnerInterceptor(DbType.MYSQL)
        );
        return interceptor;
    }
}`;

  const paginationJavaCode = `// Service 层：使用 Page<T> 发起分页查询
@Service
public class ProductService {

    @Autowired
    private ProductMapper productMapper;

    public Page<Product> listProducts(int pageNum, int pageSize) {
        // Page<T>(当前页码, 每页条数)，页码从 1 开始
        Page<Product> page = new Page<>(pageNum, pageSize);

        // selectPage 自动执行两条 SQL：
        //   1. SELECT COUNT(*) FROM product WHERE ...
        //   2. SELECT * FROM product WHERE ... LIMIT ?, ?
        return productMapper.selectPage(page,
            new LambdaQueryWrapper<Product>()
                .eq(Product::getStatus, 1)   // WHERE status = 1
                .orderByDesc(Product::getId)
        );
    }
}`;

  const paginationResultCode = `// Page<T> 包含所有分页元数据，直接返回给前端
Page<Product> result = service.listProducts(2, 10);

result.getRecords();    // List<Product>，当前页数据
result.getTotal();      // long，总记录数（COUNT 查询结果）
result.getPages();      // long，总页数 = ceil(total / size)
result.getCurrent();    // long，当前页码
result.getSize();       // long，每页条数
result.hasPrevious();   // boolean
result.hasNext();       // boolean

// 前端通常期望的响应结构：
// {
//   "records": [...],
//   "total": 100,
//   "pages": 10,
//   "current": 2,
//   "size": 10
// }`;

  const paginationConfigBlock = codeBlock('① 注册分页插件（全局一次）', 'dot-blue', 'java', paginationConfigCode);

  const paginationPair = codeBlocksRow([
    codeBlock('② Service 层分页查询', 'dot-green', 'java', paginationJavaCode),
    codeBlock('③ Page<T> 返回的字段', 'dot-orange', 'java', paginationResultCode),
  ]);

  const paginationNote = ruleBox('success',
    `<strong>分页插件的工作原理：</strong><br>
    调用 <code>selectPage</code> 时，插件拦截 SQL，先执行 <code>SELECT COUNT(*)</code> 得到总数，
    再在原 SQL 末尾追加 <code>LIMIT #{offset}, #{size}</code> 执行数据查询。
    两步都在同一个事务内完成，结果封装进 <code>Page&lt;T&gt;</code> 返回。<br><br>
    <strong>前端类比：</strong>相当于后端帮你做了 <code>Array.slice(offset, offset + size)</code> 并顺手告诉你 <code>arr.length</code>，
    你不需要自己算偏移量和总页数。`);

  const paginationCustomXmlCode = `<!-- 自定义 SQL 也支持分页：方法第一个参数传入 Page 对象即可 -->
<!-- Mapper 接口 -->
Page<ProductVO> selectPageWithCategory(Page<ProductVO> page,
                                        @Param("status") Integer status);

<!-- XML 里只写业务 SQL，不写 LIMIT，插件自动追加 -->
<select id="selectPageWithCategory" resultType="ProductVO">
  SELECT p.*, c.name AS category_name
  FROM product p
  LEFT JOIN category c ON p.category_id = c.id
  <where>
    <if test="status != null">AND p.status = #{status}</if>
  </where>
  ORDER BY p.id DESC
</select>`;

  const paginationCustomBlock = codeBlock('自定义 JOIN SQL 也能分页（Mapper 接口 + XML）', 'dot-blue', 'xml', paginationCustomXmlCode);

  const paginationCustomNote = ruleBox('info',
    `<strong>关键：方法第一个参数必须是 <code>Page&lt;T&gt;</code></strong>，MyBatis-Plus 通过参数位置识别分页请求。
    返回值也声明为 <code>Page&lt;T&gt;</code>，框架会把查询结果填充进去。
    XML 里的 SQL <em>不要手写 LIMIT</em>，插件会自动追加，手写了反而会报语法错误。`);

  // ── Section 3：逻辑删除 ───────────────────────────────────────────────────

  const logicDeleteSchemaCode = `-- 表结构：加一列 is_deleted 表示逻辑删除状态
ALTER TABLE product ADD COLUMN is_deleted TINYINT NOT NULL DEFAULT 0;
-- 0 = 正常，1 = 已删除（deleted 值可在配置里自定义）`;

  const logicDeleteEntityCode = `// 实体类：@TableLogic 标注逻辑删除字段
@Data
@TableName("product")
public class Product {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;
    private BigDecimal price;
    private Integer status;

    // MyBatis-Plus 识别此字段为逻辑删除标记
    // 删除时：UPDATE product SET is_deleted = 1 WHERE id = ?
    // 查询时：自动追加 WHERE is_deleted = 0
    @TableLogic
    private Integer isDeleted;
}`;

  const logicDeleteConfigCode = `# application.yml：全局配置（也可以用注解默认值，不写这段）
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: isDeleted   # 全局逻辑删除字段名（驼峰）
      logic-delete-value: 1           # 删除后的值
      logic-not-delete-value: 0       # 未删除的值`;

  const logicDeleteSchemaBlock = codeBlock('表结构：加 is_deleted 列', 'dot-blue', 'sql', logicDeleteSchemaCode);

  const logicDeletePair = codeBlocksRow([
    codeBlock('实体类：@TableLogic', 'dot-green', 'java', logicDeleteEntityCode),
    codeBlock('全局配置（可选）', 'dot-orange', 'yaml', logicDeleteConfigCode),
  ]);

  const logicDeleteSqlCode = `// 下面展示 @TableLogic 后，BaseMapper 方法生成的实际 SQL

// 1. 删除（逻辑删除）
productMapper.deleteById(1L);
// → UPDATE product SET is_deleted = 1 WHERE id = 1

// 2. 查询（自动过滤）
productMapper.selectById(1L);
// → SELECT * FROM product WHERE id = 1 AND is_deleted = 0

productMapper.selectList(null);
// → SELECT * FROM product WHERE is_deleted = 0

// 3. 更新（自动过滤）
productMapper.updateById(product);
// → UPDATE product SET ... WHERE id = ? AND is_deleted = 0

// 4. 查已删除数据（需绕过 MyBatis-Plus，用自定义 SQL）
// → SELECT * FROM product WHERE id = 1   （不加 is_deleted 条件）`;

  const logicDeleteSqlBlock = codeBlock('BaseMapper 方法生成的实际 SQL', 'dot-orange', 'java', logicDeleteSqlCode);

  const logicDeleteNote = ruleBox('success',
    `<strong>@TableLogic 的效果是全自动的：</strong>只要实体类加了注解，
    BaseMapper 的所有方法（selectById、selectList、updateById、deleteById 等）都会自动处理逻辑删除条件，
    不需要在每个查询里手写 <code>AND is_deleted = 0</code>。<br><br>
    <strong>前端类比：</strong>相当于给所有请求加了一个全局 axios 拦截器，统一在请求参数里追加 <code>deleted=false</code>，
    业务代码完全不感知这个过滤条件的存在。`);

  const logicDeletePitfalls = ruleBox('warning',
    `<strong>逻辑删除注意事项：</strong><br><br>
    <strong>① 自定义 XML SQL 不自动追加条件</strong><br>
    只有 BaseMapper 内置方法才自动处理，自己写的 <code>&lt;select&gt;</code> XML 需要手动加 <code>AND is_deleted = 0</code>。<br><br>
    <strong>② 唯一索引与逻辑删除冲突</strong><br>
    如果 <code>name</code> 有唯一索引，删除后再插入同名记录会因 is_deleted=1 的旧行占位而报唯一键冲突。
    常见解法：唯一索引改为联合索引 <code>(name, is_deleted)</code>，或把 is_deleted 改为用 id 值填充（删除时 <code>is_deleted = id</code>）。<br><br>
    <strong>③ 物理删除用 baseMapper 的 deleteBatchIds 吗？</strong><br>
    不行，仍是逻辑删除。真正物理删除需调用原生 SQL 或用 <code>@SqlParser(filter = true)</code> 绕过拦截器。`);

  // ── Section 4：LambdaQueryWrapper 速查 ──────────────────────────────────

  const lambdaCode = `// LambdaQueryWrapper：类型安全的条件构造器，避免手写列名字符串

LambdaQueryWrapper<Product> wrapper = new LambdaQueryWrapper<Product>()
    .eq(Product::getStatus, 1)                      // status = 1
    .like(name != null, Product::getName, name)      // name LIKE '%?%'（条件为 true 才加）
    .ge(Product::getPrice, 100)                      // price >= 100
    .in(Product::getCategoryId, List.of(1L, 2L, 3L)) // category_id IN (1,2,3)
    .orderByDesc(Product::getId)                     // ORDER BY id DESC
    .last("LIMIT 10");                               // 追加任意 SQL 片段（慎用）

List<Product> list = productMapper.selectList(wrapper);

// 分页 + 条件组合：
Page<Product> page = new Page<>(1, 10);
productMapper.selectPage(page, wrapper);`;

  const lambdaBlock = codeBlock('LambdaQueryWrapper 常用方法', 'dot-blue', 'java', lambdaCode);

  const lambdaCompareTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">方法</div>
        <div class="compare-card-header-cell java">生成 SQL</div>
        <div class="compare-card-header-cell desc">备注</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.eq(col, val)</code></div>
        <div class="compare-card-cell java"><code>col = val</code></div>
        <div class="compare-card-cell desc">等于</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.ne(col, val)</code></div>
        <div class="compare-card-cell java"><code>col != val</code></div>
        <div class="compare-card-cell desc">不等于</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.like(col, val)</code></div>
        <div class="compare-card-cell java"><code>col LIKE '%val%'</code></div>
        <div class="compare-card-cell desc">模糊匹配（自动加 %）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.ge / .le / .gt / .lt</code></div>
        <div class="compare-card-cell java"><code>>= / <= / > / <</code></div>
        <div class="compare-card-cell desc">范围比较</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.in(col, list)</code></div>
        <div class="compare-card-cell java"><code>col IN (...)</code></div>
        <div class="compare-card-cell desc">list 为空时不生成该条件</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.isNull / .isNotNull</code></div>
        <div class="compare-card-cell java"><code>IS NULL / IS NOT NULL</code></div>
        <div class="compare-card-cell desc">NULL 判断</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend"><code>.eq(cond, col, val)</code></div>
        <div class="compare-card-cell java">cond 为 true 才追加</div>
        <div class="compare-card-cell desc">条件开关，替代 if 判断</div>
      </div>
    </div>`;

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('分页插件（PaginationInnerInterceptor）', paginationConfigBlock + paginationPair + paginationNote + paginationCustomBlock + paginationCustomNote)}
    ${section('逻辑删除（@TableLogic）', logicDeleteSchemaBlock + logicDeletePair + logicDeleteSqlBlock + logicDeleteNote + logicDeletePitfalls)}
    ${section('LambdaQueryWrapper 速查', lambdaBlock + lambdaCompareTable)}`);
}
