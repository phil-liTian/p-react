function renderMybatisDynamicSql(t) {
  // ── Section 1：结论 ────────────────────────────────────────────────────────

  const conclusion = ruleBox('info',
    `<strong>MyBatis 动态 SQL：用声明式标签替代手拼 SQL 字符串。</strong><br><br>
    手拼 SQL 有两大问题：① 容易拼出语法错误（多余的 AND、括号不闭合）；② 直接拼变量有 SQL 注入风险。
    <code>&lt;if&gt;</code> 和 <code>&lt;foreach&gt;</code> 是 MyBatis 内置的模板引擎，在框架层彻底解决这两个问题。`);

  // ── Section 2：<if> ────────────────────────────────────────────────────────

  const ifPainCode = `// ❌ 手拼 WHERE 字符串：多条件时容易出 bug
public List<Product> search(String name, Integer status) {
    String sql = "SELECT * FROM product WHERE 1=1";
    if (name != null) {
        sql += " AND name = '" + name + "'";  // ⚠️ SQL 注入：name 可传入 ' OR '1'='1
    }
    if (status != null) {
        sql += " AND status = " + status;
    }
    // 如果两个条件都为 null → "SELECT * FROM product WHERE 1=1"（多余的 WHERE 1=1）
    return jdbcTemplate.query(sql, ...);
}`;

  const ifFrontendCode = `// 前端也有同样的痛点：拼 query params
function buildQuery(name, status) {
  const params = {};
  if (name)   params.name   = name;    // 条件赋值，不用字符串拼接
  if (status) params.status = status;
  return new URLSearchParams(params).toString();
  // → "name=foo&status=1"（自动处理 & 分隔符）
}
// MyBatis 的 <if> 做的是同一件事，只是在 SQL 层面`;

  const ifMybatisCode = `<!-- ✅ MyBatis <if> + <where>：声明式，安全，无多余符号 -->
<select id="search" resultType="Product">
  SELECT * FROM product
  <where>
    <!-- test 里写 Java 表达式，null 检查或字符串非空检查都支持 -->
    <if test="name != null and name != ''">
      AND name = #{name}
    </if>
    <if test="status != null">
      AND status = #{status}
    </if>
  </where>
  <!-- 两个条件都为 null 时：WHERE 子句整体省略，SQL 变为 SELECT * FROM product -->
</select>`;

  const ifPair = codeBlocksRow([
    codeBlock('❌ 手拼字符串（SQL 注入风险）', 'dot-red', 'java', ifPainCode),
    codeBlock('前端类比：拼 query params', 'dot-blue', 'javascript', ifFrontendCode),
  ]);

  const ifSolution = codeBlock('✅ MyBatis <if> + <where>', 'dot-green', 'xml', ifMybatisCode);

  const whereNote = ruleBox('success',
    `<strong><code>&lt;where&gt;</code> 标签的作用：</strong>自动处理多余的 <code>AND / OR</code>——
    它会去掉第一个条件前面的 AND，并且当所有 <code>&lt;if&gt;</code> 条件均为 false 时，连 <code>WHERE</code> 关键字本身也不生成。
    永远不要手写 <code>WHERE 1=1</code> 来做占位符，用 <code>&lt;where&gt;</code> 代替。`);

  // ── Section 3：<foreach> ───────────────────────────────────────────────────

  const foreachPainCode = `// ❌ 手拼 IN 子句：要手动处理逗号和括号
public List<Product> findByIds(List<Long> ids) {
    String inClause = ids.stream()
        .map(String::valueOf)
        .collect(Collectors.joining(",", "(", ")"));
    // → "(1,2,3)"
    String sql = "SELECT * FROM product WHERE id IN " + inClause;
    // ⚠️ 如果 ids 来自用户输入，仍有 SQL 注入风险
    // ⚠️ ids 为空时 IN () 是非法 SQL
    return jdbcTemplate.query(sql, ...);
}`;

  const foreachFrontendCode = `// 前端类比：ids.join(',') 就是 foreach 在做的事
const ids = [1, 2, 3];

// 手动拼接
const inClause = '(' + ids.join(',') + ')';  // "(1,2,3)"

// MyBatis <foreach> 等价于：
// open="(" + ids.map(id => "?").join(",") + close=")"
// 并自动绑定每个参数，不存在注入风险`;

  const foreachMybatisCode = `<!-- ✅ MyBatis <foreach>：自动处理分隔符、括号和参数绑定 -->
<!-- collection: 对应 @Param("ids") 或方法参数名 -->
<!-- item: 循环变量名，在 #{} 中引用 -->
<!-- open/separator/close: 控制 IN (...) 的输出格式 -->
<select id="findByIds" resultType="Product">
  SELECT * FROM product
  WHERE id IN
  <foreach collection="ids" item="id" open="(" separator="," close=")">
    #{id}
  </foreach>
  <!-- 最终 SQL: WHERE id IN (?,?,?)，参数自动绑定，无注入风险 -->
</select>`;

  const foreachPair = codeBlocksRow([
    codeBlock('❌ 手拼 IN 子句', 'dot-red', 'java', foreachPainCode),
    codeBlock('前端类比：ids.join(",")', 'dot-blue', 'javascript', foreachFrontendCode),
  ]);

  const foreachSolution = codeBlock('✅ MyBatis <foreach>', 'dot-green', 'xml', foreachMybatisCode);

  const foreachNote = ruleBox('warning',
    `<strong>ids 为空时怎么办？</strong>
    <code>WHERE id IN ()</code> 是非法 SQL，执行会报错。在调用 Mapper 前，Service 层应校验列表非空：
    <code>if (ids == null || ids.isEmpty()) return Collections.emptyList();</code>`);

  // ── Section 4：完整实战 ────────────────────────────────────────────────────

  const mapperInterfaceCode = `// Mapper 接口
public interface ProductMapper {

    /**
     * 多条件商品筛选
     * @param name        商品名称（可选，模糊匹配）
     * @param status      上架状态 0/1（可选）
     * @param categoryIds 分类 ID 列表（可选，IN 查询）
     */
    List<Product> searchProducts(
        @Param("name")        String name,
        @Param("status")      Integer status,
        @Param("categoryIds") List<Long> categoryIds
    );
}`;

  const mapperXmlCode = `<!-- ProductMapper.xml -->
<select id="searchProducts" resultType="Product">
  SELECT id, name, price, status, category_id
  FROM product
  <where>
    <if test="name != null and name != ''">
      AND name LIKE CONCAT('%', #{name}, '%')
    </if>
    <if test="status != null">
      AND status = #{status}
    </if>
    <if test="categoryIds != null and categoryIds.size() > 0">
      AND category_id IN
      <foreach collection="categoryIds" item="cid" open="(" separator="," close=")">
        #{cid}
      </foreach>
    </if>
  </where>
  ORDER BY id DESC
</select>`;

  const practiceNote = ruleBox('info',
    `<strong>注意 <code>categoryIds.size() &gt; 0</code> 的写法：</strong>
    在 MyBatis 的 <code>test</code> 表达式中调用 Java 方法是合法的。
    这里同时检查非 null 和非空，避免生成 <code>IN ()</code> 非法 SQL。
    也可以在 Service 层提前过滤，两种方式都可以，选一处处理即可，不要两处都写。`);

  const combinedPair = codeBlocksRow([
    codeBlock('Mapper 接口', 'dot-orange', 'java', mapperInterfaceCode),
    codeBlock('XML 映射（<if> + <foreach> 组合）', 'dot-green', 'xml', mapperXmlCode),
  ]);

  // ── Section 5：#{} vs ${} 与 SQL 注入 ────────────────────────────────────

  const hashVsDollarConclusion = ruleBox('danger',
    `<strong>一句话原则：永远用 <code>#{}</code>，只有动态表名/列名才用 <code>\${}</code>，且必须来源可信。</strong><br><br>
    两者的本质区别：<code>#{}</code> 生成 <code>PreparedStatement</code> 占位符 <code>?</code>，参数在 SQL 编译后再绑定；
    <code>\${}</code> 是字符串直接插入，SQL 编译时参数值已经拼进去了——攻击者可以通过构造特殊字符串改写 SQL 语义。`);

  const sqlInjectionCode = `// ❌ 用 \${} 拼入用户输入 → SQL 注入
// Mapper XML: SELECT * FROM user WHERE name = '\${name}'

// 正常调用：name = "alice"
// → SELECT * FROM user WHERE name = 'alice'   ✅

// 攻击调用：name = "' OR '1'='1"
// → SELECT * FROM user WHERE name = '' OR '1'='1'
//   WHERE 条件恒为 true，返回全表数据！                ❌

// 更危险：name = "'; DROP TABLE user; --"
// → SELECT * FROM user WHERE name = ''; DROP TABLE user; --'
//   直接删表！（取决于数据库驱动是否允许多语句）        ❌`;

  const preparedStatementCode = `// ✅ 用 #{} → PreparedStatement 预编译，自动转义
// Mapper XML: SELECT * FROM user WHERE name = #{name}

// MyBatis 内部等价于：
PreparedStatement ps = conn.prepareStatement(
    "SELECT * FROM user WHERE name = ?"   // SQL 先编译，结构固定
);
ps.setString(1, name);  // 参数后绑定，特殊字符被转义为字面量

// 攻击调用：name = "' OR '1'='1"
// → 数据库收到的 SQL：SELECT * FROM user WHERE name = ?' OR '1'='1'
//   name 列只会精确匹配这个字符串，无法逃出参数边界       ✅`;

  const sqlInjectionPair = codeBlocksRow([
    codeBlock('❌ \${} 字符串拼接（SQL 注入）', 'dot-red', 'java', sqlInjectionCode),
    codeBlock('✅ #{} 预编译占位符（安全）', 'dot-green', 'java', preparedStatementCode),
  ]);

  const dollarLegalCode = `<!-- \${} 唯一合法场景：动态表名 / 列名 -->
<!-- 表名和列名不能是 PreparedStatement 参数，只能用 \${} -->

<!-- ✅ 合法：order 字段来自后端枚举，不来自用户直接输入 -->
<select id="listProducts" resultType="Product">
  SELECT * FROM product
  ORDER BY \${orderColumn} \${orderDir}
  <!-- orderColumn 必须是后端白名单校验过的枚举值，如 "price" / "created_at" -->
  <!-- orderDir 必须是 "ASC" 或 "DESC"，不允许用户自由输入 -->
</select>

<!-- ✅ 合法：分表场景，表名由业务逻辑计算，不来自用户 -->
<select id="queryByMonth" resultType="Order">
  SELECT * FROM order_\${tableSuffix}   <!-- tableSuffix = "2024_06"，由代码拼接 -->
  WHERE user_id = #{userId}
</select>`;

  const dollarLegalNote = ruleBox('warning',
    `<strong>使用 <code>\${}</code> 时必须做的两件事：</strong><br>
    ① <strong>后端白名单校验</strong>：在 Service 层用枚举或固定字符串校验，拒绝不在白名单内的值<br>
    ② <strong>绝不透传用户输入</strong>：<code>\${}</code> 的值必须由后端代码计算，不能直接取自请求参数<br><br>
    一旦把用户输入直接传给 <code>\${}</code>，等于把 SQL 控制权交给了攻击者。`);

  const hashVsDollarTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">特性</div>
        <div class="compare-card-header-cell java">#{ }</div>
        <div class="compare-card-header-cell desc">\${ }</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">处理方式</div>
        <div class="compare-card-cell java">PreparedStatement 占位符 <code>?</code></div>
        <div class="compare-card-cell desc">字符串直接替换</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">SQL 注入防护</div>
        <div class="compare-card-cell java">✅ 安全（参数在编译后绑定）</div>
        <div class="compare-card-cell desc">❌ 危险（特殊字符不转义）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">性能</div>
        <div class="compare-card-cell java">✅ SQL 可缓存，多次执行复用执行计划</div>
        <div class="compare-card-cell desc">每次生成不同 SQL，无法复用</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">适用场景</div>
        <div class="compare-card-cell java">列值、WHERE 条件、LIKE 参数（99% 场景）</div>
        <div class="compare-card-cell desc">表名、列名（仅白名单校验后使用）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">前端类比</div>
        <div class="compare-card-cell java"><code>encodeURIComponent(val)</code></div>
        <div class="compare-card-cell desc">直接字符串拼接模板</div>
      </div>
    </div>`;

  const likeInjectionCode = `<!-- ⚠️ LIKE 模糊查询的常见错误写法 -->

<!-- ❌ 错误：用 \${} 拼 %，有注入风险 -->
<if test="name != null">
  AND name LIKE '%\${name}%'
</if>

<!-- ✅ 正确方式一：CONCAT + #{} -->
<if test="name != null">
  AND name LIKE CONCAT('%', #{name}, '%')
</if>

<!-- ✅ 正确方式二：在 Java 层拼好 % 再传入 -->
// Service 层：
String namePattern = "%" + name + "%";
mapper.search(namePattern);
// XML：AND name LIKE #{namePattern}  （#{} 安全）`;

  const likeNote = ruleBox('info',
    `<strong>LIKE 查询中 <code>%</code> 的处理：</strong>
    <code>#{}</code> 只转义 SQL 特殊字符（单引号等），不转义 <code>%</code> 和 <code>_</code>（它们是 LIKE 通配符）。
    如果用户搜索 <code>%</code> 本身，需要额外转义：<code>LIKE CONCAT('%', REPLACE(#{name}, '%', '\\%'), '%')</code>。
    实际项目中通常在 Service 层处理，保持 XML 简洁。`);

  // ── Section 6：resultMap 一对一 / 一对多 ─────────────────────────────────

  const resultMapConclusion = ruleBox('info',
    `<strong>resultType vs resultMap：</strong>
    <code>resultType</code> 适合字段名与列名一一对应的简单场景；
    一旦涉及<strong>驼峰映射、嵌套对象（一对一）、嵌套集合（一对多）</strong>，必须用 <code>resultMap</code>。
    <code>resultMap</code> 是 MyBatis 最核心的映射配置，理解它等于理解 MyBatis 的一半。`);

  const resultMapSchemaCode = `-- 数据库表结构（用于后续所有示例）
CREATE TABLE orders (
    id         BIGINT PRIMARY KEY,
    total      DECIMAL(10,2),
    user_id    BIGINT,          -- FK → users.id
    created_at DATETIME
);

CREATE TABLE users (
    id       BIGINT PRIMARY KEY,
    username VARCHAR(64),
    email    VARCHAR(128)
);

CREATE TABLE order_items (
    id         BIGINT PRIMARY KEY,
    order_id   BIGINT,          -- FK → orders.id
    product_id BIGINT,
    qty        INT,
    price      DECIMAL(10,2)
);`;

  const resultMapSchemaBlock = codeBlock('表结构（orders / users / order_items）', 'dot-blue', 'sql', resultMapSchemaCode);

  // ── 一对一 ──

  const oneToOneJavaCode = `// Java 实体：Order 内嵌 User（一对一）
public class Order {
    private Long    id;
    private BigDecimal total;
    private LocalDateTime createdAt;
    private User    user;      // 嵌套对象，对应 users 表
    // getters / setters ...
}

public class User {
    private Long   id;
    private String username;
    private String email;
    // getters / setters ...
}`;

  const oneToOneXmlCode = `<!-- resultMap：一对一关联用 <association> -->
<resultMap id="OrderWithUser" type="Order">
  <!-- column: SQL 列名；property: Java 字段名 -->
  <id     column="order_id"    property="id" />
  <result column="total"       property="total" />
  <result column="created_at"  property="createdAt" />

  <!-- association: 映射嵌套的单个对象 -->
  <!-- javaType: 嵌套对象的 Java 类型 -->
  <association property="user" javaType="User">
    <id     column="user_id"   property="id" />
    <result column="username"  property="username" />
    <result column="email"     property="email" />
  </association>
</resultMap>

<select id="findOrderWithUser" resultMap="OrderWithUser">
  SELECT
    o.id         AS order_id,
    o.total,
    o.created_at,
    u.id         AS user_id,
    u.username,
    u.email
  FROM orders o
  JOIN users u ON o.user_id = u.id
  WHERE o.id = #{id}
</select>`;

  const oneToOnePair = codeBlocksRow([
    codeBlock('Java 实体（嵌套 User）', 'dot-orange', 'java', oneToOneJavaCode),
    codeBlock('resultMap + <association>', 'dot-green', 'xml', oneToOneXmlCode),
  ]);

  const oneToOneNote = ruleBox('success',
    `<strong><code>&lt;association&gt;</code> 的关键点：</strong><br>
    ① <strong>列名别名</strong>：JOIN 后两张表都有 <code>id</code> 列，必须用 AS 重命名（如 <code>o.id AS order_id</code>），
    再在 <code>column</code> 属性里引用别名，否则 MyBatis 无法区分哪个 id 映射到哪个对象。<br>
    ② <strong>javaType</strong>：告诉 MyBatis 嵌套对象的类型，通常写全限定类名或在 mybatis-config.xml 中配置别名。<br>
    ③ <code>&lt;id&gt;</code> vs <code>&lt;result&gt;</code>：<code>&lt;id&gt;</code> 标记主键列，MyBatis 用它做缓存 key 和去重判断，必须写对。`);

  // ── 一对多 ──

  const oneToManyJavaCode = `// Java 实体：Order 内嵌 List<OrderItem>（一对多）
public class Order {
    private Long    id;
    private BigDecimal total;
    private LocalDateTime createdAt;
    private User          user;       // 一对一
    private List<OrderItem> items;    // 一对多
    // getters / setters ...
}

public class OrderItem {
    private Long   id;
    private Long   productId;
    private int    qty;
    private BigDecimal price;
    // getters / setters ...
}`;

  const oneToManyXmlCode = `<!-- resultMap：一对多关联用 <collection> -->
<resultMap id="OrderFull" type="Order">
  <id     column="order_id"   property="id" />
  <result column="total"      property="total" />
  <result column="created_at" property="createdAt" />

  <association property="user" javaType="User">
    <id     column="user_id"  property="id" />
    <result column="username" property="username" />
    <result column="email"    property="email" />
  </association>

  <!-- collection: 映射嵌套的对象集合 -->
  <!-- ofType: 集合元素的 Java 类型（不是 List 本身）-->
  <collection property="items" ofType="OrderItem">
    <id     column="item_id"    property="id" />
    <result column="product_id" property="productId" />
    <result column="qty"        property="qty" />
    <result column="price"      property="price" />
  </collection>
</resultMap>

<select id="findOrderFull" resultMap="OrderFull">
  SELECT
    o.id          AS order_id,
    o.total,
    o.created_at,
    u.id          AS user_id,
    u.username,
    u.email,
    i.id          AS item_id,
    i.product_id,
    i.qty,
    i.price
  FROM orders o
  JOIN users       u ON o.user_id  = u.id
  LEFT JOIN order_items i ON i.order_id = o.id
  WHERE o.id = #{id}
</select>`;

  const oneToManyPair = codeBlocksRow([
    codeBlock('Java 实体（含 List<OrderItem>）', 'dot-orange', 'java', oneToManyJavaCode),
    codeBlock('resultMap + <collection>', 'dot-green', 'xml', oneToManyXmlCode),
  ]);

  const oneToManyNote = ruleBox('success',
    `<strong><code>&lt;collection&gt;</code> 的关键点：</strong><br>
    ① <strong>ofType 而非 javaType</strong>：<code>javaType</code> 是对象本身的类型，<code>ofType</code> 是集合<em>元素</em>的类型。
    写 <code>ofType="OrderItem"</code> 而不是 <code>ofType="List&lt;OrderItem&gt;"</code>。<br>
    ② <strong>MyBatis 自动合并行</strong>：SQL 返回 3 行（一个订单有 3 个 item），MyBatis 根据 <code>order_id</code> 的 <code>&lt;id&gt;</code> 判断是同一个 Order，
    自动把 3 行合并成 1 个 Order 对象、items 列表有 3 个元素。<br>
    ③ <strong>LEFT JOIN vs JOIN</strong>：items 可能为空，用 <code>LEFT JOIN</code> 确保没有 item 的订单也能查出来（items 为空列表而非 null）。`);

  // ── 对比表 ──

  const resultMapCompareTable = `
    <div class="compare-card">
      <div class="compare-card-header">
        <div class="compare-card-header-cell frontend">场景</div>
        <div class="compare-card-header-cell java">标签</div>
        <div class="compare-card-header-cell desc">关键属性</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">普通列映射</div>
        <div class="compare-card-cell java"><code>&lt;result&gt;</code></div>
        <div class="compare-card-cell desc"><code>column</code>（SQL 列名）→ <code>property</code>（Java 字段名）</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">主键列</div>
        <div class="compare-card-cell java"><code>&lt;id&gt;</code></div>
        <div class="compare-card-cell desc">同 result，但 MyBatis 用它做缓存 key 和去重</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">一对一（嵌套对象）</div>
        <div class="compare-card-cell java"><code>&lt;association&gt;</code></div>
        <div class="compare-card-cell desc"><code>property</code> + <code>javaType</code>，内部再写 id/result</div>
      </div>
      <div class="compare-card-row">
        <div class="compare-card-cell frontend">一对多（嵌套集合）</div>
        <div class="compare-card-cell java"><code>&lt;collection&gt;</code></div>
        <div class="compare-card-cell desc"><code>property</code> + <code>ofType</code>（元素类型），内部再写 id/result</div>
      </div>
    </div>`;

  const resultMapPitfalls = ruleBox('warning',
    `<strong>resultMap 常见陷阱：</strong><br><br>
    <strong>① 列名冲突必须加别名</strong><br>
    多表 JOIN 后两张表都有 <code>id</code>、<code>created_at</code> 等列，不加 AS 别名时 MyBatis 只能看到最后一个同名列的值，导致嵌套对象 id 被覆盖。<br><br>
    <strong>② &lt;id&gt; 不能省略</strong><br>
    缺少 <code>&lt;id&gt;</code> 时，MyBatis 无法判断哪些行属于同一个父对象，<code>&lt;collection&gt;</code> 合并行会出错——
    可能返回多个重复的父对象而不是一个含多条 items 的对象。<br><br>
    <strong>③ N+1 问题</strong><br>
    用 <code>&lt;association select="..."&gt;</code> 或 <code>&lt;collection select="..."&gt;</code> 的懒加载写法，
    查 N 条订单会触发 N 次额外 SQL。生产环境优先用单次 JOIN SQL + resultMap 合并行，避免 N+1。`);

  // ── Section 7：易错点 ──────────────────────────────────────────────────────

  const pitfalls = ruleBox('warning',
    `<strong>三个常见错误：</strong><br><br>
    <strong>① collection 名称要与 @Param 严格一致</strong><br>
    <code>&lt;foreach collection="ids"&gt;</code> 要求方法参数标注 <code>@Param("ids")</code>，
    名称不一致会抛 <code>BindingException</code>。<br><br>
    <strong>② 用 <code>#{}</code> 不用 <code>\${}</code></strong><br>
    <code>#{}</code> 是预编译占位符（PreparedStatement），防 SQL 注入；
    <code>\${}</code> 是字符串直接替换，有注入风险。唯一合法使用 <code>\${}</code> 的场景是动态表名/列名，且必须确保来源可信。<br><br>
    <strong>③ 所有 <code>&lt;if&gt;</code> 均为 false 时，<code>&lt;where&gt;</code> 省略整个 WHERE 子句</strong><br>
    这意味着查询会返回全表数据。如果业务要求「至少传一个条件」，应在 Service 层校验，而不是依赖 SQL 层。`);

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('&lt;if&gt; — 可选条件字段', ifPair + ifSolution + whereNote)}
    ${section('&lt;foreach&gt; — IN 子句', foreachPair + foreachSolution + foreachNote)}
    ${section('组合使用：多条件商品筛选', combinedPair + practiceNote)}
    ${section('#{ } vs \${ } 与 SQL 注入', hashVsDollarConclusion + sqlInjectionPair + hashVsDollarTable + codeBlock('\${} 合法使用场景：动态表名/列名', 'dot-orange', 'xml', dollarLegalCode) + dollarLegalNote + codeBlock('LIKE 模糊查询的正确写法', 'dot-blue', 'xml', likeInjectionCode) + likeNote)}
    ${section('resultMap — 一对一 / 一对多', resultMapConclusion + resultMapSchemaBlock + oneToOnePair + oneToOneNote + oneToManyPair + oneToManyNote + resultMapCompareTable + resultMapPitfalls)}
    ${section('易错点速查', pitfalls)}`);
}
