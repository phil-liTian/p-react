# Java 事务知识点设计稿（Spring Boot 单表事务 · 入门）

## 背景

在 `demo/java.html` 中新增一个 topic，面向前端开发者介绍 Spring Boot 单表事务的基本概念和用法。

## 目标读者

前端开发者，了解 JS 异步、熟悉 try/catch，但未接触过 Spring 事务机制。

## Topic 元信息

```js
{
  id: 'spring-transaction-intro',
  name: 'Spring Boot 单表事务',
  group: '🗄️ 数据库',
  type: 'success',
  icon: '🔒',
  tags: [
    { label: '@Transactional', type: 'success' },
    { label: '原子性', type: 'info' },
    { label: '回滚', type: 'danger' },
    { label: '入门', type: 'accent' },
  ],
}
```

## Section 结构

### Section 1 — 核心结论

组件：`rule-box-info`

内容：
> **事务 = 一组操作的"要么全成功，要么全回滚"保证。**
>
> 前端类比：你写过 `Promise.all` 失败后手动 undo 多个状态吗？事务就是数据库帮你做了这件事——任何一步失败，之前所有改动自动撤销，不需要你手写 rollback 逻辑。

### Section 2 — 前端 vs Spring：谁来负责回滚？

组件：`code-blocks-row`（双栏对比）

**左栏 — JavaScript（前端手动回滚）**

```js
// 前端：手动管理"回滚"
async function transfer(from, to, amount) {
  try {
    await deductBalance(from, amount)   // 第一步
    await addBalance(to, amount)        // 第二步：如果这里失败...
  } catch (e) {
    await addBalance(from, amount)      // 必须手动撤销第一步
    throw e
  }
}
```

**右栏 — Java（Spring 自动回滚）**

```java
// Spring：@Transactional 自动回滚
@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // 第一步
    userMapper.addBalance(toId, amount);       // 第二步：失败则两步都撤销
    // 不需要写任何 catch + undo 逻辑
}
```

### Section 3 — 中间步骤失败了，数据会怎样？

组件：`code-blocks-row`（双栏对比，dot-red / dot-green）

**左栏 — 无事务（数据不一致）**

```java
// 没有 @Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // ✅ 扣款成功，已写入 DB
    if (true) throw new RuntimeException("网络超时");
    userMapper.addBalance(toId, amount);       // ❌ 永远不会执行
    // 结果：fromId 钱少了，toId 没收到，数据永久不一致
}
```

**右栏 — 有事务（自动回滚）**

```java
@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // 扣款（在事务内，未提交）
    if (true) throw new RuntimeException("网络超时");
    userMapper.addBalance(toId, amount);       // 不会执行
    // Spring 捕获到 RuntimeException → 自动 ROLLBACK
    // 结果：fromId 的钱回来了，数据保持一致
}
```

### Section 4 — ACID 是什么意思？

组件：`compareCard`（三列：ACID 特性 / 含义 / 前端类比）

| ACID 特性 | 含义 | 前端类比 |
|-----------|------|---------|
| Atomicity 原子性 | 要么全做，要么全撤 | `Promise.all` 失败时没有中间状态 |
| Consistency 一致性 | 事务前后数据满足约束 | 表单提交后字段不违反 unique / not null |
| Isolation 隔离性 | 并发事务互不干扰 | 两用户同时操作，看不到彼此未提交的数据 |
| Durability 持久性 | 提交后不会丢失 | `localStorage.setItem` 后刷新页面数据还在 |

表头：`ACID` / `Java（Spring Boot）` / `前端类比`

### Section 5 — 常用注解参数

组件：`code-block`（dot-orange，Java）+ `rule-box-warning`

代码：
```java
@Transactional(
    rollbackFor = Exception.class,  // 默认只回滚 RuntimeException，加这行让所有异常都回滚
    readOnly = true,                // 只读事务：SELECT 专用，数据库可做性能优化
    timeout = 30                    // 超时秒数，超时自动回滚（类似 fetch 的 AbortController）
)
public UserDTO getUserById(Long id) { ... }
```

警告框：
> **注意：`@Transactional` 只在 Spring Bean 的 public 方法上生效。** 如果你在同一个类内部直接调用带 `@Transactional` 的方法（自调用），事务不会生效——这是最常见的陷阱，后续专题会详细讲。

## 实现说明

- 在 `topics` 数组末尾追加新 topic 对象
- 新增 `renderSpringTransactionIntro(t)` 渲染函数
- 在 `renderers` 对象中注册 `'spring-transaction-intro': renderSpringTransactionIntro`
- `compareCard` 的列标题改为 `['ACID', 'Java（Spring Boot）']`，第三列描述为前端类比（需在 compareCard helper 中支持自定义表头）
- compareCard 当前 headers 参数只接受两个值，第三列固定为"说明"——第三列内容直接写前端类比即可，不需要改 helper
