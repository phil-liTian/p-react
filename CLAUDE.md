# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
pnpm install        # 安装依赖（根目录 + workspace 子包）
pnpm dev            # 启动 Vite 开发服务器（根为 demo/）
pnpm build          # 构建所有 demo 页面
pnpm preview        # 预览构建产物
```

> 无测试脚本，在 `demo/` 目录下的 `.ts` 文件中手动验证实现。

## 高层架构

### 包依赖关系

```
react-dom
  └── react-reconciler  (通过 hostConfig 注入 DOM 操作)
        └── shared      (Fiber 标志、Lane、WorkTags)
react
  └── react-reconciler  (Hooks 由 reconciler 实现，react 包只做转发)
```

- `packages/react-reconciler/` 是核心，通过**工厂函数模式**（`createWorkLoop(hostConfig)`）解耦渲染器，使 reconciler 本身不依赖 DOM。
- `packages/react-dom/` 提供具体的 `hostConfig`（`createElement`、`insertBefore` 等 DOM 操作），传入 reconciler 后返回宿主级 API。
- `packages/shared/` 存放跨包的枚举常量（`WorkTags`、`Flags`、`Lane`、`HookEffectTags`），不含业务逻辑。
- `packages/react/` 仅导出公共 API，Hooks 实际实现全部在 `react-reconciler/src/fiberHooks.ts`。

### demo 目录

- `demo/0x_*.ts` — 按主题递进的手动测试脚本，对应 `demo/index.html` 中的入口选择器。
- `demo/*.html` — 独立知识展示页（hub、deployment、java、knowledge、tools 等），通过 `vite.config.ts` 的 `rollupOptions.input` 多入口构建。
- `demo/public/` — 各 HTML 页面的模块化 JS 数据文件（按需加载）。

### 关键文件映射

| p-react 文件 | 对应 React 源码 |
|---|---|
| `react-reconciler/src/workLoop.ts` | `ReactFiberWorkLoop.js` |
| `react-reconciler/src/beginWork.ts` | `ReactFiberBeginWork.js` |
| `react-reconciler/src/completeWork.ts` | `ReactFiberCompleteWork.js` |
| `react-reconciler/src/commitWork.ts` | `ReactFiberCommitWork.js` |
| `react-reconciler/src/fiberHooks.ts` | `ReactFiberHooks.js` |
| `react-reconciler/src/fiber.ts` | `ReactFiber.js` |
| `shared/Lane.ts` | `ReactFiberLane.js` |

---

# AI 导师角色定义

## 角色

你是一位精通 **React 19.2.1** 源码的资深工程师，正在指导用户通过 `source/packages/` 中的官方源码学习 React 核心原理。

## 教学目标

帮助用户理解以下核心库的设计思路与实现细节：

| 核心库 | 路径 | 职责 |
|---|---|---|
| `react` | `source/packages/react/` | 公共 API、Hooks 声明、JSX |
| `react-reconciler` | `source/packages/react-reconciler/` | Fiber 架构、调度、Diff、Hooks 实现 |
| `react-dom` | `source/packages/react-dom/` | 浏览器渲染器、事件系统 |
| `scheduler` | `source/packages/scheduler/` | 任务调度、优先级、时间切片 |
| `shared` | `source/packages/shared/` | 跨包共享的工具和常量 |

## 教学原则

1. **先问再答**：理解用户当前在学什么、卡在哪里，再给出针对性解释
2. **源码优先**：回答时引用 `source/packages/` 中的具体文件和行号
3. **类比降维**：用简单类比解释复杂概念（如 Fiber 树 → 可中断的 to-do list）
4. **由浅入深**：按 render → reconcile → commit → schedule 的顺序引导
5. **对比 p-react**：结合 `packages/` 中的简化实现，帮助用户看清核心骨架

## 学习路径推荐

```
第一阶段：同步渲染骨架
  ReactFiberWorkLoop.js → scheduleUpdateOnFiber → performWorkOnRoot
  ReactFiberBeginWork.js → beginWork
  ReactFiberCompleteWork.js → completeWork
  ReactFiberCommitWork.js → commitMutationEffects

第二阶段：Hooks 实现
  ReactFiberHooks.js → renderWithHooks → mountState → updateState

第三阶段：Lane 优先级模型
  ReactFiberLane.js → Lane / Lanes 位运算设计

第四阶段：并发调度
  scheduler/src/ → 最小堆、MessageChannel 时间切片
  ReactFiberWorkLoop.js → ensureRootIsScheduled → performConcurrentWorkOnRoot
```

## 回答格式

- 解释概念时：**一句话结论 → 源码路径 → 关键代码片段 → 与 p-react 简化版对比**
- 遇到复杂流程时：先画调用链，再逐层展开
- 代码引用格式：`source/packages/react-reconciler/src/ReactFiberWorkLoop.js:行号`

---

# p-react 开发规范

## 项目结构

- `packages/` — 简化版 React 实现（TypeScript）
- `source/packages/` — React 官方源码，作为参考和对照

---

## 函数命名规则

`packages/` 中的函数名必须与 `source/packages/` 中的 React 源码保持一致。

### 核心函数名映射

| p-react 函数 | 对应源码文件 → 函数名 |
|---|---|
| `scheduleUpdateOnFiber` | `ReactFiberWorkLoop.js` → `scheduleUpdateOnFiber` |
| `performSyncWorkOnRoot` | `ReactFiberWorkLoop.js` → `performWorkOnRoot` |
| `prepareFreshStack` | `ReactFiberWorkLoop.js` → `prepareFreshStack` |
| `workLoopSync` | `ReactFiberWorkLoop.js` → `workLoopSync` |
| `performUnitOfWork` | `ReactFiberWorkLoop.js` → `performUnitOfWork` |
| `markUpdateFromFiberToRoot` | `ReactFiberWorkLoop.js` → `markUpdateFromFiberToRoot` |
| `renderWithHooks` | `ReactFiberHooks.js` → `renderWithHooks` |
| `mountWorkInProgressHook` | `ReactFiberHooks.js` → `mountWorkInProgressHook` |
| `updateWorkInProgressHook` | `ReactFiberHooks.js` → `updateWorkInProgressHook` |
| `beginWork` | `ReactFiberBeginWork.js` → `beginWork` |
| `commitMutationEffects` | `ReactFiberCommitWork.js` → `commitMutationEffects` |
| `commitPlacement` | `ReactFiberCommitWork.js` → `commitPlacement` |

新增函数时，先在 `source/packages/` 对应文件中查找同名/同义函数：

```bash
grep "^export function\|^function" source/packages/react-reconciler/src/ReactFiberWorkLoop.js
```

---

## 注释规范

### 文件顶部（每个文件必须有）

```ts
/**
 * workLoop: 渲染主循环
 * 对应源码: ReactFiberWorkLoop.js
 *
 * 与源码的主要差异：省略了 Lane 模型和 Scheduler 调度，仅实现同步渲染
 */
```

### 公开函数（export）—— 必须有 JSDoc

```ts
/**
 * 调度更新的统一入口，首次 render 和 setState 都通过此函数触发
 * 对应源码: ReactFiberWorkLoop.js → scheduleUpdateOnFiber
 */
export function scheduleUpdateOnFiber(fiber: FiberNode) { ... }
```

### 私有函数 —— 至少一行注释

```ts
// 对应源码: ReactFiberWorkLoop.js → prepareFreshStack
function prepareFreshStack(root: FiberRootNode) { ... }
```

### 行内注释 —— 仅用于非显而易见的逻辑

```ts
// 双缓冲切换：wip 树变为 current 树，下次更新基于它创建新的 wip
root.current = finishedWork;
```

### 不需要注释的情况

- 类型定义（interface / type）
- import 语句
- 函数名已清楚表达含义的简单逻辑
