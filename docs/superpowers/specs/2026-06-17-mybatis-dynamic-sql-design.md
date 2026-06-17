# MyBatis 动态 SQL（if/foreach）知识卡片设计

## 概述

新增一个 Java 知识库话题卡片，主题为 MyBatis 动态 SQL 的 `<if>` 和 `<foreach>` 标签。采用**痛点驱动**教学风格：先展示不用动态 SQL 时的反模式，再用前端 JS 类比桥接，最后展示 MyBatis 解法。

目标读者：熟悉前端 JS 的工程师，初次接触 MyBatis。

---

## 文件结构

| 文件 | 说明 |
|---|---|
| `demo/public/java/mybatis-dynamic-sql.js` | 新建，导出 `renderMybatisDynamicSql(t)` |
| `demo/public/java/data.js` | 新增话题注册条目 |

---

## data.js 注册

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
}
```

---

## 内容结构（共 5 节）

### Section 1：结论框

`ruleBox('info', ...)` — 一句话结论：
> `<if>` 和 `<foreach>` 是 MyBatis 的模板引擎，用声明式标签替代手拼 SQL 字符串，消除 SQL 注入风险和繁琐的字符串操作。

### Section 2：`<if>` — 条件字段拼接

三个内容块，展示痛点 → 前端类比 → MyBatis 解法：

1. **痛点**（`codeBlock`，Java）：手拼 `WHERE` 字符串，含 SQL 注入风险 + `WHERE AND` 语法 bug
2. **前端类比**（`codeBlock`，JavaScript）：前端拼 query params 对象的写法
3. **MyBatis 解法**（`codeBlock`，XML）：`<where>` + `<if test="...">` + `#{}` 占位符

配 `ruleBox('success', ...)` 说明 `<where>` 标签的作用：自动去掉多余的 AND/OR，全条件为 false 时连 WHERE 关键字也不生成。

### Section 3：`<foreach>` — IN 子句

三个内容块，展示痛点 → 前端类比 → MyBatis 解法：

1. **痛点**（`codeBlock`，Java）：手拼 IN 列表字符串，逗号分隔和括号处理
2. **前端类比**（`codeBlock`，JavaScript）：`ids.join(',')` 就是 foreach 在做的事
3. **MyBatis 解法**（`codeBlock`，XML）：`<foreach collection="ids" item="id" open="(" separator="," close=")">`

### Section 4：完整实战

标题：「组合使用：多条件商品筛选」

用 `codeBlocksRow` 并排展示：
- 左：Mapper 接口方法签名（Java）
- 右：对应的 XML，`<if>` 和 `<foreach>` 组合在同一个查询里

场景：按 `name`（可选）、`status`（可选）、`categoryIds`（IN 列表，可选）筛选商品列表。

### Section 5：易错点

`ruleBox('warning', ...)` 列三条易错点：
- `collection` 属性要与 `@Param("ids")` 名称严格对应
- 参数必须用 `#{}` 不用 `${}`（`${}` 直接拼字符串，有 SQL 注入风险）
- 所有条件均为 false 时，`<where>` 会省略整个 WHERE 子句——如需"查全部"，这正是期望行为；如需"至少一个条件"，需在 Service 层校验

---

## 渲染函数签名

```js
// mybatis-dynamic-sql.js
function renderMybatisDynamicSql(t) {
  // 返回 articleShell(t, innerHtml)
}
```

函数名由 app.js 的 `getRendererName('mybatis-dynamic-sql')` 自动推导：
`'mybatis-dynamic-sql'` → `renderMybatisDynamicSql`

---

## 不在范围内

- `<choose>/<when>/<otherwise>`（类似 switch，另作专题）
- `<set>` 标签（UPDATE 场景）
- MyBatis Plus LambdaQueryWrapper（另作专题）
- 批量 INSERT（`<foreach>` 的另一个用法，可后续扩展）
