import { FiberNode } from './fiber';
import { HookHasEffect, HookPassive, PassiveEffect } from '@p-react/shared';

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
        hook.memoizedState = pushEffect(HookPassive, create, prevEffect.destroy, nextDeps);
        return;
      }
    }
    fiber.flags |= PassiveEffect;
    hook.memoizedState = pushEffect(
      HookPassive | HookHasEffect,
      create,
      prevEffect.destroy,
      nextDeps
    );
    return;
  }

  const hook = mountWorkInProgressHook();
  fiber.flags |= PassiveEffect;
  hook.memoizedState = pushEffect(
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
function pushEffect(
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
