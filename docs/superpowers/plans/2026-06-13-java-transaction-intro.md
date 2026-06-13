# Spring Boot 单表事务入门 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `demo/java.html` 新增"Spring Boot 单表事务"topic，面向前端开发者通过前端类比介绍 `@Transactional` 的基本用法。

**Architecture:** 在现有 `topics` 数组末尾追加一个 topic 对象，新增 `renderSpringTransactionIntro(t)` 渲染函数，并在 `renderers` 对象中注册，不改动任何现有渲染器或 helper 函数。

**Tech Stack:** 纯 HTML + JavaScript（无构建工具），highlight.js 语法高亮，现有 `codeBlock` / `codeBlocksRow` / `ruleBox` / `section` / `compareCard` / `articleShell` helpers。

---

### Task 1: 注册新 topic 元信息

**Files:**
- Modify: `demo/java.html`（`topics` 数组，约第 531 行）

- [ ] **Step 1: 在 `topics` 数组末尾追加新 topic**

找到 `demo/java.html` 中 `topics` 数组的结束括号（`];`，约第 558 行），在其前插入：

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
  },
```

- [ ] **Step 2: 在浏览器打开 `demo/java.html`，验证侧边栏出现"🗄️ 数据库"分组和"Spring Boot 单表事务"条目**

打开文件后点击该条目，应显示空白内容区（因为渲染器还未注册，控制台会输出 `No renderer for topic: spring-transaction-intro`）。

- [ ] **Step 3: Commit**

```bash
rtk git add demo/java.html
rtk git commit -m "feat(demo): register spring-transaction-intro topic"
```

---

### Task 2: 实现渲染函数 — Section 1 + 2（核心结论 + 前端类比）

**Files:**
- Modify: `demo/java.html`（在 `renderSpringBootVsVite` 函数之后、`renderers` 对象之前插入新函数）

- [ ] **Step 1: 在 `renderers` 对象前插入函数骨架和 Section 1**

找到 `// ── Render engine` 注释行（约第 893 行），在其前插入：

```js
function renderSpringTransactionIntro(t) {
  const conclusion = ruleBox('info',
    `<strong>事务 = 一组操作的"要么全成功，要么全回滚"保证。</strong><br><br>
    前端类比：你写过 <code>Promise.all</code> 失败后手动 undo 多个状态吗？事务就是数据库帮你做了这件事——任何一步失败，之前所有改动自动撤销，不需要你手写 rollback 逻辑。`);
```

- [ ] **Step 2: 追加 Section 2 代码（前端 vs Spring 回滚对比）**

紧接 Step 1 的代码块继续添加：

```js
  const jsRollback = `// 前端：手动管理"回滚"
async function transfer(from, to, amount) {
  try {
    await deductBalance(from, amount)   // 第一步
    await addBalance(to, amount)        // 第二步：如果这里失败...
  } catch (e) {
    await addBalance(from, amount)      // 必须手动撤销第一步
    throw e
  }
}`;

  const javaRollback = `// Spring：@Transactional 自动回滚
@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // 第一步
    userMapper.addBalance(toId, amount);       // 第二步：失败则两步都撤销
    // 不需要写任何 catch + undo 逻辑
}`;

  const rollbackPair = codeBlocksRow([
    codeBlock('JavaScript（前端手动回滚）', 'dot-blue', 'javascript', jsRollback),
    codeBlock('Java（Spring 自动回滚）', 'dot-orange', 'java', javaRollback),
  ]);
```

- [ ] **Step 3: 在浏览器中刷新页面，确认函数声明不报 JS 语法错误（函数体尚未完成也没关系，不会影响其他 topic）**

- [ ] **Step 4: Commit**

```bash
rtk git add demo/java.html
rtk git commit -m "feat(demo): add transaction intro sections 1-2 (conclusion + rollback compare)"
```

---

### Task 3: 实现 Section 3（无事务 vs 有事务代码对比）

**Files:**
- Modify: `demo/java.html`（在 Task 2 代码末尾继续追加）

- [ ] **Step 1: 追加 Section 3 变量**

紧接 Task 2 的 `rollbackPair` 变量之后添加：

```js
  const noTxCode = `// 没有 @Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // ✅ 扣款成功，已写入 DB

    if (true) throw new RuntimeException("网络超时"); // 模拟异常

    userMapper.addBalance(toId, amount);       // ❌ 永远不会执行
    // 结果：fromId 钱少了，toId 没收到，数据永久不一致
}`;

  const withTxCode = `@Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    userMapper.deductBalance(fromId, amount);  // 扣款（在事务内，未提交）

    if (true) throw new RuntimeException("网络超时"); // 触发异常

    userMapper.addBalance(toId, amount);       // 不会执行
    // Spring 捕获到 RuntimeException → 自动 ROLLBACK
    // 结果：fromId 的钱回来了，数据保持一致
}`;

  const txComparePair = codeBlocksRow([
    codeBlock('无事务（数据不一致）', 'dot-red', 'java', noTxCode),
    codeBlock('有事务（自动回滚）', 'dot-green', 'java', withTxCode),
  ]);
```

- [ ] **Step 2: Commit**

```bash
rtk git add demo/java.html
rtk git commit -m "feat(demo): add transaction intro section 3 (no-tx vs with-tx)"
```

---

### Task 4: 实现 Section 4（ACID compareCard）

**Files:**
- Modify: `demo/java.html`（在 Task 3 代码末尾继续追加）

- [ ] **Step 1: 追加 Section 4 变量**

紧接 `txComparePair` 之后添加：

```js
  const acidRows = [
    ['Atomicity 原子性',  '要么全做，要么全撤',              'Promise.all 失败时没有中间状态'],
    ['Consistency 一致性', '事务前后数据满足约束',            '表单提交后字段不违反 unique / not null'],
    ['Isolation 隔离性',  '并发事务互不干扰',                '两用户同时操作，看不到彼此未提交的数据'],
    ['Durability 持久性', '提交后不会丢失',                  'localStorage.setItem 后刷新页面数据还在'],
  ];
  const acidTable = compareCard(acidRows, ['ACID 特性', 'Java（Spring Boot）']);
```

- [ ] **Step 2: Commit**

```bash
rtk git add demo/java.html
rtk git commit -m "feat(demo): add transaction intro section 4 (ACID table)"
```

---

### Task 5: 实现 Section 5（注解参数 + 警告框）并完成函数返回值

**Files:**
- Modify: `demo/java.html`（完成 `renderSpringTransactionIntro` 函数）

- [ ] **Step 1: 追加 Section 5 变量并写 return 语句**

紧接 `acidTable` 之后添加，然后闭合函数：

```js
  const annotationCode = `@Transactional(
    rollbackFor = Exception.class,  // 默认只回滚 RuntimeException，加这行让所有异常都回滚
    readOnly = true,                // 只读事务：SELECT 专用，数据库可做性能优化
    timeout = 30                    // 超时秒数，超时自动回滚（类似 fetch 的 AbortController）
)
public UserDTO getUserById(Long id) { ... }`;

  const annotationWarn = ruleBox('warning',
    `<strong>注意：<code>@Transactional</code> 只在 Spring Bean 的 public 方法上生效。</strong>
    如果你在同一个类内部直接调用带 <code>@Transactional</code> 的方法（自调用），事务不会生效——这是最常见的陷阱，后续专题会详细讲。`);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('前端 vs Spring：谁来负责回滚？', rollbackPair)}
    ${section('中间步骤失败了，数据会怎样？', txComparePair)}
    ${section('ACID 是什么意思？', acidTable)}
    ${section('常用注解参数', codeBlock('@Transactional 参数', 'dot-orange', 'java', annotationCode) + annotationWarn)}`);
}
```

- [ ] **Step 2: 在 `renderers` 对象中注册新渲染器**

找到 `renderers` 对象（约第 895 行）：

```js
const renderers = {
  'maven-vs-npm': renderMavenVsNpm,
  'spring-boot-vs-vite': renderSpringBootVsVite,
};
```

改为：

```js
const renderers = {
  'maven-vs-npm': renderMavenVsNpm,
  'spring-boot-vs-vite': renderSpringBootVsVite,
  'spring-transaction-intro': renderSpringTransactionIntro,
};
```

- [ ] **Step 3: 在浏览器中打开 `demo/java.html`，点击"Spring Boot 单表事务"**

验证以下内容全部正确显示：
- 橙色 rule-box 核心结论
- Section 2 双栏代码（JS 蓝色 / Java 橙色）
- Section 3 双栏代码（红色 dot 无事务 / 绿色 dot 有事务）
- Section 4 ACID 四行表格
- Section 5 注解参数代码块 + 黄色警告框

检查控制台无 JS 报错，代码块已被 highlight.js 高亮。

- [ ] **Step 4: Commit**

```bash
rtk git add demo/java.html
rtk git commit -m "feat(demo): complete spring-transaction-intro renderer and register"
```
