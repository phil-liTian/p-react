# 前端架构师必备 React 原理体系

> 由浅入深五层,只覆盖 react / react-reconciler / react-dom,不含 RSC

---

## 第一层:业务开发层

> 所有前端必懂,架构师需能给团队做规范

### 核心知识点

- JSX 本质、createElement、ReactElement 结构(type / props / key / ref)
- 组件分类:函数组件 / Class 组件 / Fragment / StrictMode
- 基础 Hooks 执行规则:useState / useReducer / useEffect / useLayoutEffect / useMemo / useCallback / useRef
- 状态更新基础:setState 批量更新、异步更新表象、更新触发重渲染条件
- 列表渲染 key 作用、React.memo 浅比较生效前提
- Context 跨组件传值、forwardRef、useImperativeHandle、错误边界 ErrorBoundary
- 合成事件基础、事件冒泡、阻止默认行为、事件委托机制

### 架构师要求

不止会用,能输出团队编码规范:什么时候必须加 key、如何规避 useEffect 死循环、memo 滥用性能坑、ref 合理使用边界。

---

## 第二层:渲染流程层

> 高级前端门槛,架构师必须全程闭环吃透

### 核心知识点

- 完整渲染链路:初始化 mount / 更新 update
- JSX → ReactElement → Fiber 树构建 → 调和 Diff → 收集副作用 → Commit 阶段操作 DOM
- 同步渲染 vs Concurrent 并发渲染两大模式区别
- 批量更新完整规则:同步代码批量、异步回调 / 原生事件不批量、flushSync 强制同步
- 水合 Hydrate 基础逻辑(客户端复用服务端 DOM,不深挖 SSR 服务端)
- 根节点 createRoot / render 入口差异

### 架构师要求

能复现、解释所有渲染时序问题:界面闪烁、状态延迟、多次 setState 合并、水合不匹配报错,能给业务侧提供通用解决方案。

---

## 第三层:调和层核心

> react-reconciler,架构区分分水岭,性能优化核心

### 1. Fiber 架构

- FiberNode 数据结构:return / child / sibling 单链表、各类 Flags 副作用标记
- 工作循环 workLoop:可中断、可恢复的渲染机制(并发渲染基石)
- beginWork(构建子 Fiber、Diff)、completeWork(收集 DOM 副作用)两段流程职责

### 2. Diff 调和算法

- 单节点 Diff:type 判断、key 匹配逻辑、重建 / 复用规则
- 多节点列表 Diff:旧节点 Map 缓存、lastPlacedIndex 原地移动优化、新增 / 删除标记
- Diff 三大优化策略(同层比较、key 唯一、类型不同直接销毁)底层实现

### 3. 并发调度系统 Scheduler + Lane 车道模型

- Lane 优先级分层:同步车道、用户输入高优、普通更新、低优后台更新
- 时间切片、任务中断、高优先级任务抢占逻辑
- 过期任务、饥饿任务兜底策略

### 4. Commit 三阶段(DOM 真实操作阶段)

- **beforeMutation**:执行 DOM 修改前 Effect
- **mutation**:真实增删改 DOM、ref 解绑
- **layout**:执行 useLayoutEffect、ref 绑定、同步 DOM 布局读取

### 架构师要求

公司级页面性能瓶颈定位能力:千万级表格、实时大屏、长列表卡顿根源定位;能从 Fiber 调度、Diff 层面给出底层优化方案,而不是仅调 API。

---

## 第四层:底层模块源码层

> 架构 / 基建团队刚需,可做二次开发

### 1. react 包底层实现

- Hooks 链表存储原理、索引匹配规则、Hooks 调用顺序校验源码
- useState 更新队列、批量更新队列机制
- useEffect 被动副作用链表、layoutEffect 同步副作用区分
- Context 提供者、消费者依赖追踪、嵌套更新逻辑
- React.Children 扁平化处理、cloneElement、memo 浅对比源码

### 2. react-dom 宿主层

- HostConfig 宿主适配配置(DOM 操作统一收口)
- DOM 属性、style、class 批量更新逻辑
- 合成事件完整实现:根节点事件委托、SyntheticEvent 事件池复用、原生事件映射
- 水合匹配 Fiber 逻辑、水合错位底层原因

### 3. react-reconciler 自定义渲染器能力

- 脱离 DOM,实现自定义渲染(Canvas、PDF、小程序渲染层)
- 无需修改 react 主包,仅实现 HostConfig 即可对接调和层

### 架构师要求

- **底层 bug 兜底**:上层 HOC / Hooks 无法修复的框架底层问题,可通过 patch-package 打补丁解决
- **框架自研能力**:基于 reconciler 搭建公司内部跨端渲染方案
- **评估私有 fork React 的维护成本、版本升级风险**

---

## 第五层:框架工程与二次开发层

> 大厂前端架构师核心价值

### 核心能力点

- React 版本升级风险评估:17 → 18 → 19 底层架构变更(Concurrent、自动批处理、事件委托变更)对业务的影响
- 全局框架拦截方案:不修改源码前提下,基于根组件、createElement 封装全局埋点、错误监控、权限拦截
- 底层性能监控体系搭建:在 Fiber 工作循环、commit 阶段插入渲染耗时埋点,统计组件渲染开销
- 跨端框架改造原理:Taro / Rax / RN 如何 fork / 适配 React 底层,适配小程序 / App 原生容器
- 团队技术规范落地:基于 React 底层原理制定组件设计、状态管理、性能优化标准

### 架构师独有的认知

- 明白尽量不修改 React 源码的核心原因:版本合并冲突、生态兼容断裂、问题排查成本极高
- 能区分三种扩展方案优劣:上层封装 > 自定义渲染器 > patch 补丁 > fork 源码二次开发

---

## 分层速记(由浅入深)

1. 业务 API 与渲染现象(开发)
2. 完整渲染执行流程(高级前端)
3. Fiber、Diff、并发调度、Commit 三阶段(性能优化专家)
4. react / react-dom / reconciler 源码底层实现(基建 / 跨端工程师)
5. React 工程化、版本演进、底层二次扩展、团队架构落地(前端架构师)

---

## 面试区分标准

| 级别 | 掌握程度 |
|------|----------|
| 普通开发 | 只会第一层,能说现象,讲不清底层流程 |
| 高级前端 | 掌握一、二层,能梳理完整渲染链路 |
| 性能专项 / 架构 | 吃透三层、四层,能手写简化 Fiber / Diff,定位底层渲染瓶颈 |
| 大厂前端架构 | 五层全通,能基于 React 底层做公司级框架、跨端方案、基建改造 |