---
name: p-react-implement
description: Use when implementing a new file or function in packages/ of the p-react project. Guides looking up source/, aligning function names, writing required comments, and creating demo code.
---

# p-react 实现新模块

## 概述

在 `packages/` 中新增文件或函数时，必须完成三件事：
1. 对照 `source/packages/` 源码确认函数名和注释
2. 在 `packages/` 中实现功能
3. 在 `demo/` 中写演示代码验证功能

---

## 实现步骤

### 1. 找到对应源码文件

| p-react 文件 | 对应源码文件 |
|---|---|
| `workLoop.ts` | `source/packages/react-reconciler/src/ReactFiberWorkLoop.js` |
| `beginWork.ts` | `source/packages/react-reconciler/src/ReactFiberBeginWork.js` |
| `completeWork.ts` | `source/packages/react-reconciler/src/ReactFiberCompleteWork.js` |
| `commitWork.ts` | `source/packages/react-reconciler/src/ReactFiberCommitWork.js` |
| `fiberHooks.ts` | `source/packages/react-reconciler/src/ReactFiberHooks.js` |
| `fiber.ts` | `source/packages/react-reconciler/src/ReactFiber.js` |

### 2. 查阅源码函数

```bash
# 列出源码文件中的所有函数
grep -n "^export function\|^function" source/packages/react-reconciler/src/ReactFiberWorkLoop.js

# 查找特定函数
grep -n "function scheduleUpdateOnFiber" source/packages/react-reconciler/src/ReactFiberWorkLoop.js

# 查看函数实现（确认核心逻辑）
grep -n -A 20 "^function prepareFreshStack" source/packages/react-reconciler/src/ReactFiberWorkLoop.js
```

### 3. 实现函数

按以下优先级命名：

- **必须一致**：源码中有直接对应的核心函数（`scheduleUpdateOnFiber`、`workLoopSync`、`beginWork` 等）
- **允许差异**：工厂函数包装（`createWorkLoop`、`createCommitWork`）、省略 Lane/Scheduler 导致缺失的函数
- **自由命名**：无源码对应的纯内部辅助函数

### 4. 补充注释

**文件顶部**（每个文件必须有）：

```ts
/**
 * workLoop: 渲染主循环
 * 对应源码: ReactFiberWorkLoop.js
 *
 * 与源码的主要差异：省略了 Lane 模型和 Scheduler 调度，仅实现同步渲染
 */
```

**公开函数**（export）——必须有完整 JSDoc：

```ts
/**
 * 调度更新的统一入口，首次 render 和 setState 都通过此函数触发
 * 对应源码: ReactFiberWorkLoop.js → scheduleUpdateOnFiber
 */
export function scheduleUpdateOnFiber(fiber: FiberNode) { ... }
```

**私有函数**——至少一行注释：

```ts
// 对应源码: ReactFiberWorkLoop.js → prepareFreshStack
function prepareFreshStack(root: FiberRootNode) { ... }
```

**行内注释**——仅用于非显而易见的逻辑：

```ts
// 双缓冲切换：wip 树变为 current 树，下次更新基于它创建新的 wip
root.current = finishedWork;
```

### 5. 在 demo/ 中写演示代码

**每个新实现的功能必须有对应的 demo 文件。** 演示代码要求：

- 文件命名：`demo/<功能名>.ts`，例如 `useReducer.ts`、`useRef.ts`
- 演示要覆盖功能的典型用法和边界情况（如 mount / update 两个阶段）
- 在 `demo/index.html` 中以注释形式记录可切换的 demo（只激活一个）

**演示文件模板：**

```ts
// demo/useReducer.ts
import { createElement, useReducer } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 演示 useReducer 的 mount 和 update 阶段
function Counter() {
  const [count, dispatch] = useReducer((state: number, action: string) => {
    switch (action) {
      case 'inc': return state + 1;
      case 'dec': return state - 1;
      default: return state;
    }
  }, 0);

  return createElement(
    'div',
    { style: { padding: '20px' } },
    createElement('h1', null, `Count: ${count}`),
    createElement('button', { onClick: () => dispatch('inc') }, '+1'),
    createElement('button', { onClick: () => dispatch('dec') }, '-1')
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(Counter, null));
```

**demo/index.html 注释规范：**

```html
<body>
  <div id="root"></div>
  <!-- 切换下方注释来运行不同 demo -->
  <!-- <script type="module" src="./main.ts"></script> -->
  <!-- <script type="module" src="./useState.ts"></script> -->
  <!-- <script type="module" src="./useEffect.ts"></script> -->
  <script type="module" src="./useReducer.ts"></script>
</body>
```

---

## 检查清单

- [ ] 已在 `source/packages/` 对应文件中查找同名/同义函数
- [ ] 核心函数名与源码一致（或记录了差异原因）
- [ ] 文件顶部有描述 + 差异说明的 JSDoc
- [ ] 所有 export 函数有 JSDoc，包含"对应源码"字段
- [ ] 所有私有函数至少一行注释说明用途和源码位置
- [ ] 非显而易见的逻辑有行内注释解释"为什么"
- [ ] 已在 `demo/` 目录下新建对应演示文件, ts命名为递增的数字索引
- [ ] 演示文件覆盖了 mount 和 update 两个阶段（如适用）
- [ ] `demo/index.html` 已更新（新 demo 激活，旧 demo 注释）

---

## 不需要注释的情况

- 类型定义（`interface` / `type`）
- `import` 语句
- 函数名已清楚表达含义的简单赋值或 getter
