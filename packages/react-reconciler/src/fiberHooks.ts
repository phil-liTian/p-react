import { FiberNode } from './fiber';
import { HookHasEffect, HookPassive, HookLayout, HookInsertion, PassiveEffect, LayoutEffect, InsertionEffect } from '@p-react/shared';
import type { ReactContext } from '@p-react/react';

// --- 类型定义 ---

export interface Effect {
  tag: number;
  create: () => (() => void) | void;
  destroy: (() => void) | void;
  deps: any[] | null;
  next: Effect | null;
}

interface Hook {
  memoizedState: any;
  queue: UpdateQueue<any> | null;
  next: Hook | null;
}

/**
 * useState 的更新对象
 * 对应源码: ReactFiberHooks.js 中的 Update
 */
interface Update<State> {
  action: ((prevState: State) => State) | State;
  next: Update<State> | null;
}

/**
 * useState 的更新队列（环形链表）
 * 对应源码: ReactFiberHooks.js 中的 UpdateQueue
 */
interface UpdateQueue<State> {
  pending: Update<State> | null;
  lastRenderedState: State;
}

// fiber.updateQueue 上挂载的 effect 环形链表容器
interface FCUpdateQueue {
  lastEffect: Effect | null;
}

// --- 模块级状态 ---

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

/**
 * mount/update 标记，在 renderWithHooks 入口一次性确定
 * 对应源码中通过切换 ReactCurrentDispatcher 实现的 mount/update 分发
 * 简化为布尔标记，避免每个 hook 单独判断 currentHook 指针导致的边界问题
 */
let isMount = true;

/**
 * scheduleUpdateOnFiber 的引用，由 workLoop 注入
 * 避免 fiberHooks → workLoop 的循环依赖
 */
let scheduleUpdateOnFiberFn: ((fiber: FiberNode) => void) | null = null;

export function setScheduleUpdateOnFiber(fn: (fiber: FiberNode) => void) {
  scheduleUpdateOnFiberFn = fn;
}

// --- 公共 API ---

/**
 * 渲染函数组件时的入口，设置 hooks 上下文后执行组件函数
 * 对应源码: renderWithHooks (ReactFiberHooks.js)
 *
 * mount 阶段 (current === null): 使用 mountWorkInProgressHook 创建新 hook
 * update 阶段 (current !== null): 使用 updateWorkInProgressHook 从 current 读取已有 hook
 */
export function renderWithHooks(
  current: FiberNode | null,
  workInProgress: FiberNode,
  Component: Function,
  props: any
): any {
  currentlyRenderingFiber = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;

  if (current !== null && current.memoizedState !== null) {
    currentHook = current.memoizedState;
    isMount = false;
  } else {
    currentHook = null;
    isMount = true;
  }

  const children = Component(props);

  currentlyRenderingFiber = null;
  workInProgressHook = null;
  currentHook = null;

  return children;
}

// --- useReducer ---

/**
 * useReducer hook
 * 对应源码: ReactFiberHooks.js → mountReducer / updateReducer
 */
export function useReducer<State, Action>(
  reducer: (state: State, action: Action) => State,
  initialArg: State
): [State, (action: Action) => void] {
  if (isMount) {
    return mountReducer(reducer, initialArg);
  }
  return updateReducer(reducer);
}

// 对应源码: ReactFiberHooks.js → mountReducer
function mountReducer<State, Action>(
  reducer: (state: State, action: Action) => State,
  initialArg: State
): [State, (action: Action) => void] {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialArg;

  const queue: UpdateQueue<State> = {
    pending: null,
    lastRenderedState: initialArg,
  };
  hook.queue = queue;

  const dispatch = (dispatchReducerAction as any).bind(
    null,
    currentlyRenderingFiber!,
    queue,
    reducer
  ) as (action: Action) => void;

  return [hook.memoizedState, dispatch];
}

// 对应源码: ReactFiberHooks.js → updateReducer
function updateReducer<State, Action>(
  reducer: (state: State, action: Action) => State
): [State, (action: Action) => void] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue as UpdateQueue<State>;
  const pending = queue.pending;

  let baseState = hook.memoizedState as State;

  if (pending !== null) {
    const firstUpdate = pending.next!;
    let update = firstUpdate as Update<State>;
    do {
      // useReducer 直接调用外部 reducer 计算新 state，而 useState 用 basicStateReducer
      baseState = reducer(baseState, update.action as unknown as Action);
      update = update.next as Update<State>;
    } while (update !== firstUpdate);

    queue.pending = null;
  }

  hook.memoizedState = baseState;
  queue.lastRenderedState = baseState;

  const dispatch = (dispatchReducerAction as any).bind(
    null,
    currentlyRenderingFiber!,
    queue,
    reducer
  ) as (action: Action) => void;

  return [baseState, dispatch];
}

/**
 * useReducer 的 dispatch 函数
 * 与 dispatchSetState 的区别：需要携带 reducer 引用，action 直接入队（不走 basicStateReducer）
 * 对应源码: ReactFiberHooks.js → dispatchReducerAction
 */
function dispatchReducerAction<State, Action>(
  fiber: FiberNode,
  queue: UpdateQueue<any>,
  _reducer: (state: State, action: Action) => State,
  action: Action
): void {
  const update: Update<Action> = { action, next: null };

  // 环形链表入队：pending 指向最后一个 update，pending.next 指向第一个
  const pending = queue.pending;
  if (pending === null) {
    update.next = update as any;
  } else {
    update.next = pending.next;
    pending.next = update as any;
  }
  queue.pending = update as any;

  scheduleUpdateOnFiberFn!(fiber);
}

// --- useState ---

/**
 * useState hook
 * 对应源码: ReactFiberHooks.js 中的 useState → mountState / updateState
 * useState 本质是预设了 basicStateReducer 的 useReducer
 */
export function useState<State>(
  initialState: (() => State) | State
): [State, (action: ((prevState: State) => State) | State) => void] {
  if (isMount) {
    return mountState(initialState);
  }
  return updateState();
}

function mountState<State>(
  initialState: (() => State) | State
): [State, (action: ((prevState: State) => State) | State) => void] {
  const hook = mountWorkInProgressHook();

  const memoizedState =
    typeof initialState === 'function'
      ? (initialState as () => State)()
      : initialState;

  hook.memoizedState = memoizedState;

  const queue: UpdateQueue<State> = {
    pending: null,
    lastRenderedState: memoizedState,
  };
  hook.queue = queue;

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber!,
    queue
  ) as (action: ((prevState: State) => State) | State) => void;

  return [memoizedState, dispatch];
}

/**
 * update 阶段的 useState
 * 遍历 queue.pending 环形链表，依次执行 update.action，计算最终 state
 * 对应源码中 updateReducer + basicStateReducer
 */
function updateState<State>(): [
  State,
  (action: ((prevState: State) => State) | State) => void
] {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue as UpdateQueue<State>;
  const pending = queue.pending;

  let baseState = hook.memoizedState as State;

  if (pending !== null) {
    const firstUpdate = pending.next!;
    let update: Update<State> | null = firstUpdate;
    do {
      const action = update!.action;
      baseState = basicStateReducer(baseState, action);
      update = update!.next;
    } while (update !== firstUpdate);

    queue.pending = null;
  }

  hook.memoizedState = baseState;
  queue.lastRenderedState = baseState;

  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber!,
    queue
  ) as (action: ((prevState: State) => State) | State) => void;

  return [baseState, dispatch];
}

/**
 * basicStateReducer: useState 的内置 reducer
 * action 是函数 → 传入 prevState 执行；否则直接替换
 */
function basicStateReducer<State>(
  state: State,
  action: ((prevState: State) => State) | State
): State {
  if (typeof action === 'function') {
    return (action as (prevState: State) => State)(state);
  }
  return action;
}

/**
 * setState 的实际执行函数
 * 创建 Update 入队到 hook.queue.pending（环形链表），然后触发 scheduleUpdateOnFiber
 * fiber 参数通过 bind 在 mount 时固定，保证 dispatch 总是关联到正确的 fiber 和 queue
 */
function dispatchSetState<State>(
  fiber: FiberNode,
  queue: UpdateQueue<any>,
  action: ((prevState: State) => State) | State
): void {
  const update: Update<State> = { action, next: null };

  // 环形链表入队：pending 指向最后一个 update，pending.next 指向第一个
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;

  scheduleUpdateOnFiberFn!(fiber);
}

// --- useEffect ---

export function useEffect(
  create: () => (() => void) | void,
  deps?: any[]
) {
  const fiber = currentlyRenderingFiber!;
  const nextDeps = deps === undefined ? null : deps;

  if (!isMount) {
    const hook = updateWorkInProgressHook();
    const prevEffect = hook.memoizedState as Effect;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffectImpl(HookPassive, create, prevEffect.destroy, nextDeps);
        return;
      }
    }
    fiber.flags |= PassiveEffect;
    hook.memoizedState = pushEffectImpl(
      HookPassive | HookHasEffect,
      create,
      prevEffect.destroy,
      nextDeps
    );
    return;
  }

  const hook = mountWorkInProgressHook();
  fiber.flags |= PassiveEffect;
  hook.memoizedState = pushEffectImpl(
    HookPassive | HookHasEffect,
    create,
    undefined,
    nextDeps
  );
}

// --- 内部实现 ---

function mountWorkInProgressHook(): Hook {
  const hook: Hook = { memoizedState: null, queue: null, next: null };

  if (workInProgressHook === null) {
    currentlyRenderingFiber!.memoizedState = hook;
  } else {
    workInProgressHook.next = hook;
  }
  workInProgressHook = hook;

  return hook;
}

/**
 * update 阶段从 current fiber 的 hook 链表中按顺序取对应的 hook，
 * clone 到 wip fiber 的链表上
 * hooks 不能放在条件语句中的原因：mount 和 update 必须按相同顺序调用，
 * 否则 currentHook 指针会错位
 */
function updateWorkInProgressHook(): Hook {
  const nextCurrentHook = currentHook;

  if (nextCurrentHook === null) {
    throw new Error(
      'Rendered more hooks than during the previous render.'
    );
  }

  currentHook = nextCurrentHook.next;

  const newHook: Hook = {
    memoizedState: nextCurrentHook.memoizedState,
    queue: nextCurrentHook.queue,
    next: null,
  };

  if (workInProgressHook === null) {
    currentlyRenderingFiber!.memoizedState = newHook;
  } else {
    workInProgressHook.next = newHook;
  }
  workInProgressHook = newHook;

  return newHook;
}

/**
 * 将 effect 推入 fiber.updateQueue 的环形链表
 * lastEffect.next 即第一个 effect，O(1) 访问头尾
 */
function pushEffectImpl(
  tag: number,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: any[] | null
): Effect {
  const effect: Effect = { tag, create, destroy, deps, next: null };
  const fiber = currentlyRenderingFiber!;

  let updateQueue = fiber.updateQueue as FCUpdateQueue | null;
  if (updateQueue === null) {
    updateQueue = { lastEffect: null };
    fiber.updateQueue = updateQueue;
    effect.next = effect;
    updateQueue.lastEffect = effect;
  } else {
    const lastEffect = updateQueue.lastEffect!;
    const firstEffect = lastEffect.next!;
    lastEffect.next = effect;
    effect.next = firstEffect;
    updateQueue.lastEffect = effect;
  }

  return effect;
}

function areHookInputsEqual(nextDeps: any[], prevDeps: any[] | null): boolean {
  if (prevDeps === null) return false;
  for (let i = 0; i < nextDeps.length && i < prevDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) continue;
    return false;
  }
  return true;
}

// --- useLayoutEffect ---

/**
 * useLayoutEffect hook：同步执行，DOM 变更后、浏览器 paint 前触发
 * 对应源码: ReactFiberHooks.js → mountLayoutEffect / updateLayoutEffect
 *
 * 与 useEffect 的区别：fiber 上打 LayoutEffect flag（而非 PassiveEffect），
 * 在 commitRoot 的 layout 阶段同步执行，不走 setTimeout 异步队列
 */
export function useLayoutEffect(
  create: () => (() => void) | void,
  deps?: any[]
) {
  const fiber = currentlyRenderingFiber!;
  const nextDeps = deps === undefined ? null : deps;

  if (!isMount) {
    return updateLayoutEffect(fiber, create, nextDeps);
  }
  return mountLayoutEffect(fiber, create, nextDeps);
}

// 对应源码: ReactFiberHooks.js → mountLayoutEffect → mountEffectImpl
function mountLayoutEffect(
  fiber: FiberNode,
  create: () => (() => void) | void,
  nextDeps: any[] | null
) {
  const hook = mountWorkInProgressHook();
  fiber.flags |= LayoutEffect;
  hook.memoizedState = pushEffectImpl(HookLayout | HookHasEffect, create, undefined, nextDeps);
}

// 对应源码: ReactFiberHooks.js → updateLayoutEffect → updateEffectImpl
function updateLayoutEffect(
  fiber: FiberNode,
  create: () => (() => void) | void,
  nextDeps: any[] | null
) {
  const hook = updateWorkInProgressHook();
  const prevEffect = hook.memoizedState as Effect;

  if (nextDeps !== null) {
    if (areHookInputsEqual(nextDeps, prevEffect.deps)) {
      hook.memoizedState = pushEffectImpl(HookLayout, create, prevEffect.destroy, nextDeps);
      return;
    }
  }

  fiber.flags |= LayoutEffect;
  hook.memoizedState = pushEffectImpl(HookLayout | HookHasEffect, create, prevEffect.destroy, nextDeps);
}

// --- useInsertionEffect ---

/**
 * useInsertionEffect hook：mutation 阶段内同步执行，早于 useLayoutEffect
 * 专为 CSS-in-JS 库设计，在 DOM 变更期间注入样式，确保 useLayoutEffect 读取布局时样式已就绪
 * 对应源码: ReactFiberHooks.js → mountInsertionEffect / updateInsertionEffect
 *
 * 执行时机：mutation 阶段（commitMutationEffects）中，DOM Placement/Update 之前
 * 与 useLayoutEffect 的区别：更早执行，且无法访问 DOM refs（refs 尚未赋值）
 */
export function useInsertionEffect(
  create: () => (() => void) | void,
  deps?: any[]
) {
  const fiber = currentlyRenderingFiber!;
  const nextDeps = deps === undefined ? null : deps;

  if (!isMount) {
    return updateInsertionEffect(fiber, create, nextDeps);
  }
  return mountInsertionEffect(fiber, create, nextDeps);
}

// 对应源码: ReactFiberHooks.js → mountInsertionEffect → mountEffectImpl
function mountInsertionEffect(
  fiber: FiberNode,
  create: () => (() => void) | void,
  nextDeps: any[] | null
) {
  const hook = mountWorkInProgressHook();
  fiber.flags |= InsertionEffect;
  hook.memoizedState = pushEffectImpl(HookInsertion | HookHasEffect, create, undefined, nextDeps);
}

// 对应源码: ReactFiberHooks.js → updateInsertionEffect → updateEffectImpl
function updateInsertionEffect(
  fiber: FiberNode,
  create: () => (() => void) | void,
  nextDeps: any[] | null
) {
  const hook = updateWorkInProgressHook();
  const prevEffect = hook.memoizedState as Effect;

  if (nextDeps !== null) {
    if (areHookInputsEqual(nextDeps, prevEffect.deps)) {
      hook.memoizedState = pushEffectImpl(HookInsertion, create, prevEffect.destroy, nextDeps);
      return;
    }
  }

  fiber.flags |= InsertionEffect;
  hook.memoizedState = pushEffectImpl(HookInsertion | HookHasEffect, create, prevEffect.destroy, nextDeps);
}

// --- useRef ---

/**
 * useRef hook：返回一个持久化的可变对象 {current: initialValue}
 * 对应源码: ReactFiberHooks.js → mountRef / updateRef
 *
 * 与 useState 的区别：修改 .current 不触发重渲染；ref 对象在组件生命周期内始终是同一个引用
 */
export function useRef<T>(initialValue: T): { current: T } {
  if (isMount) {
    return mountRef(initialValue);
  }
  return updateRef<T>();
}

// 对应源码: ReactFiberHooks.js → mountRef
function mountRef<T>(initialValue: T): { current: T } {
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };
  hook.memoizedState = ref;
  return ref;
}

// 对应源码: ReactFiberHooks.js → updateRef
function updateRef<T>(): { current: T } {
  const hook = updateWorkInProgressHook();
  return hook.memoizedState;
}

// --- useImperativeHandle ---

/**
 * 将 create() 返回的方法集合暴露给父组件持有的 ref
 * 对应源码: ReactFiberHooks.js → mountImperativeHandle / updateImperativeHandle
 *
 * 实现方式：以 layout effect 的形式，在 commit 阶段将 create() 结果写入 ref.current，
 * 并在 cleanup 时将 ref.current 置 null。deps 变化才重新执行 create()。
 */
export function useImperativeHandle<T>(
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined,
  create: () => T,
  deps?: any[]
): void {
  const fiber = currentlyRenderingFiber!;
  const nextDeps = deps === undefined ? null : deps;
  // ref 加入依赖，保证 ref 对象变化时同步更新
  const effectDeps = nextDeps !== null ? [...nextDeps, ref] : null;

  if (!isMount) {
    return updateImperativeHandle(fiber, ref, create, effectDeps);
  }
  return mountImperativeHandle(fiber, ref, create, effectDeps);
}

// 对应源码: ReactFiberHooks.js → mountImperativeHandle → mountEffectImpl
function mountImperativeHandle<T>(
  fiber: FiberNode,
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined,
  create: () => T,
  effectDeps: any[] | null
) {
  const hook = mountWorkInProgressHook();
  fiber.flags |= LayoutEffect;
  hook.memoizedState = pushEffectImpl(
    HookLayout | HookHasEffect,
    (imperativeHandleEffect as any).bind(null, create, ref),
    undefined,
    effectDeps
  );
}

// 对应源码: ReactFiberHooks.js → updateImperativeHandle → updateEffectImpl
function updateImperativeHandle<T>(
  fiber: FiberNode,
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined,
  create: () => T,
  effectDeps: any[] | null
) {
  const hook = updateWorkInProgressHook();
  const prevEffect = hook.memoizedState as Effect;

  if (effectDeps !== null) {
    if (areHookInputsEqual(effectDeps, prevEffect.deps)) {
      hook.memoizedState = pushEffectImpl(HookLayout, (imperativeHandleEffect as any).bind(null, create, ref), prevEffect.destroy, effectDeps);
      return;
    }
  }

  fiber.flags |= LayoutEffect;
  hook.memoizedState = pushEffectImpl(
    HookLayout | HookHasEffect,
    (imperativeHandleEffect as any).bind(null, create, ref),
    prevEffect.destroy,
    effectDeps
  );
}

// 对应源码: ReactFiberHooks.js → imperativeHandleEffect
function imperativeHandleEffect<T>(
  create: () => T,
  ref: { current: T | null } | ((inst: T | null) => void) | null | undefined
): (() => void) | void {
  if (typeof ref === 'function') {
    const inst = create();
    ref(inst);
    return () => ref(null);
  } else if (ref !== null && ref !== undefined) {
    ref.current = create();
    return () => { ref.current = null; };
  }
}

// --- useContext ---

/**
 * 读取 Context 的当前值，不消耗 hook slot（不调用 mountWorkInProgressHook）
 * 对应源码: ReactFiberHooks.js → useContext → readContext
 * 对应源码: ReactFiberNewContext.js → readContext
 *
 * 简化差异：源码中还会收集 context 依赖链（fiber.dependencies），以支持 context 变化时
 * 精确触发订阅了该 context 的 fiber 重渲染。p-react 省略依赖收集，
 * 每次渲染时直接读取 context._currentValue 即可满足演示需求。
 */
export function useContext<T>(context: ReactContext<T>): T {
  return context._currentValue;
}

