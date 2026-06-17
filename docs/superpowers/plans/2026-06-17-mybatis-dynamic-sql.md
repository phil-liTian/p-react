# MyBatis 动态 SQL（if/foreach）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增「MyBatis 动态 SQL」知识卡片，采用痛点驱动风格，通过前端 JS 类比讲解 `<if>` 和 `<foreach>` 标签。

**Architecture:** 新建 `demo/public/java/mybatis-dynamic-sql.js`，导出 `renderMybatisDynamicSql(t)` 函数；在 `data.js` 末尾注册话题条目。渲染函数复用 `data.js` 中已有的 `articleShell / section / codeBlock / codeBlocksRow / ruleBox / escHtml` 等 helpers，无需引入新依赖。

**Tech Stack:** Vanilla JS，HTML 字符串模板，highlight.js（XML/Java/JavaScript 语法高亮）

---

## 文件映射

| 操作 | 文件 | 职责 |
|---|---|---|
| 新建 | `demo/public/java/mybatis-dynamic-sql.js` | 渲染函数，包含全部内容节 |
| 修改 | `demo/public/java/data.js` | 注册话题卡片条目 |

---

### Task 1：在 data.js 注册话题条目

**Files:**
- Modify: `demo/public/java/data.js:196-209`（在 `java-utils` 条目之前插入）

- [ ] **Step 1：在 `data.js` 的 topics 数组中，在 `java-utils` 条目之前插入新条目**

找到 `java-utils` 条目（约第 197 行），在其前面插入：

```js
  {
    id: 'mybatis-dynamic-sql',
    name: 'MyBatis 动态 SQL',
    group: '🗄️ 数据库',
    type: 'info',
    icon: '🧩',
    tags: [
      { label: 'MyBatis', type: 'info' },
      { label: '<if>', type: 'accent' },
      { label: '<foreach>', type: 'warning' },
      { label: '动态 SQL', type: 'success' },
    ],
  },
```

- [ ] **Step 2：在浏览器中打开 demo，确认侧边栏「🗄️ 数据库」分组出现「MyBatis 动态 SQL」条目**

点击该条目时会触发脚本加载，此时会 404（文件尚未创建），属于预期行为。

- [ ] **Step 3：Commit**

```bash
git add demo/public/java/data.js
git commit -m "feat(java): register mybatis-dynamic-sql topic"
```

---

### Task 2：创建渲染文件骨架，验证加载

**Files:**
- Create: `demo/public/java/mybatis-dynamic-sql.js`

- [ ] **Step 1：创建文件，写入最小骨架**

```js
function renderMybatisDynamicSql(t) {
  return articleShell(t, `<p>占位</p>`);
}
```

- [ ] **Step 2：在浏览器中点击侧边栏「MyBatis 动态 SQL」**

预期：文章区出现标题 + 标签，内容显示「占位」，无控制台报错。

- [ ] **Step 3：Commit**

```bash
git add demo/public/java/mybatis-dynamic-sql.js
git commit -m "feat(java): scaffold mybatis-dynamic-sql renderer"
```

---

### Task 3：实现 Section 1 结论框 + Section 2 `<if>` 三联对比

**Files:**
- Modify: `demo/public/java/mybatis-dynamic-sql.js`

- [ ] **Step 1：替换骨架，写入 Section 1 结论框和 Section 2**

```js
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

  // ── 组装 ──────────────────────────────────────────────────────────────────

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('<if> — 可选条件字段', ifPair + ifSolution + whereNote)}`);
}
```

- [ ] **Step 2：在浏览器中验证**

预期：出现「核心结论」蓝色框和「`<if>` — 可选条件字段」节，三个代码块语法高亮正常（Java / JavaScript / XML）。

- [ ] **Step 3：Commit**

```bash
git add demo/public/java/mybatis-dynamic-sql.js
git commit -m "feat(java): add mybatis-dynamic-sql sections 1-2 (conclusion + if)"
```

---

### Task 4：实现 Section 3 `<foreach>` 三联对比

**Files:**
- Modify: `demo/public/java/mybatis-dynamic-sql.js`

- [ ] **Step 1：在 `renderMybatisDynamicSql` 中，在 `whereNote` 之后添加 Section 3 变量，并更新 return 语句**

在 `whereNote` 定义之后、`return` 之前插入：

```js
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
<select id="findByIds" resultType="Product">
  SELECT * FROM product
  WHERE id IN
  <foreach
    collection="ids"   <!-- 对应 @Param("ids") 或方法参数名 -->
    item="id"          <!-- 循环变量名，在 #{} 中使用 -->
    open="("           <!-- IN 列表开始符 -->
    separator=","      <!-- 元素之间的分隔符 -->
    close=")"          <!-- IN 列表结束符 -->
  >
    #{id}              <!-- 参数占位符，防注入 -->
  </foreach>
  <!-- ids = [1,2,3] → WHERE id IN (#{0},#{1},#{2}) → WHERE id IN (1,2,3) -->
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
```

将 `return` 语句更新为：

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('<if> — 可选条件字段', ifPair + ifSolution + whereNote)}
    ${section('<foreach> — IN 子句', foreachPair + foreachSolution + foreachNote)}`);
```

- [ ] **Step 2：在浏览器中验证**

预期：新增「`<foreach>` — IN 子句」节，三个代码块语法高亮正常，底部出现黄色警告框。

- [ ] **Step 3：Commit**

```bash
git add demo/public/java/mybatis-dynamic-sql.js
git commit -m "feat(java): add mybatis-dynamic-sql section 3 (foreach)"
```

---

### Task 5：实现 Section 4 完整实战 + Section 5 易错点

**Files:**
- Modify: `demo/public/java/mybatis-dynamic-sql.js`

- [ ] **Step 1：在 `foreachNote` 之后、`return` 之前插入 Section 4 和 Section 5 变量**

```js
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
      <foreach collection="categoryIds" item="cid"
               open="(" separator="," close=")">
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

  // ── Section 5：易错点 ──────────────────────────────────────────────────────

  const pitfalls = ruleBox('warning',
    `<strong>三个常见错误：</strong><br><br>
    <strong>① collection 名称要与 @Param 严格一致</strong><br>
    <code>&lt;foreach collection="ids"&gt;</code> 要求方法参数标注 <code>@Param("ids")</code>，
    名称不一致会抛 <code>BindingException</code>。<br><br>
    <strong>② 用 <code>#{}</code> 不用 <code>${}</code></strong><br>
    <code>#{}</code> 是预编译占位符（PreparedStatement），防 SQL 注入；
    <code>${}</code> 是字符串直接替换，有注入风险。唯一合法使用 <code>${}</code> 的场景是动态表名/列名，且必须确保来源可信。<br><br>
    <strong>③ 所有 <code>&lt;if&gt;</code> 均为 false 时，<code>&lt;where&gt;</code> 省略整个 WHERE 子句</strong><br>
    这意味着查询会返回全表数据。如果业务要求「至少传一个条件」，应在 Service 层校验，而不是依赖 SQL 层。`);
```

将 `return` 语句更新为：

```js
  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('<if> — 可选条件字段', ifPair + ifSolution + whereNote)}
    ${section('<foreach> — IN 子句', foreachPair + foreachSolution + foreachNote)}
    ${section('组合使用：多条件商品筛选', combinedPair + practiceNote)}
    ${section('易错点速查', pitfalls)}`);
```

- [ ] **Step 2：在浏览器中验证全部 5 节**

预期：
- 全部 5 节正确渲染
- 代码块语法高亮：Java（橙点）、JavaScript（蓝点）、XML（绿点）
- 3 个 ruleBox 颜色：info（蓝）、success（绿）、warning×2（黄）、info（蓝）
- 无控制台报错

- [ ] **Step 3：Commit**

```bash
git add demo/public/java/mybatis-dynamic-sql.js
git commit -m "feat(java): add mybatis-dynamic-sql sections 4-5 (practice + pitfalls)"
```
