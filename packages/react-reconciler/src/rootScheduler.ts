/**
 * rootScheduler: 根节点调度器
 * 对应源码: ReactFiberRootScheduler.js
 *
 * 与源码的主要差异：
 * - 省略了 Scheduler 包（最小堆 + MessageChannel 时间切片）
 * - 用 queueMicrotask 实现"同一 tick 内的批处理"，用 setTimeout 实现"非同步 Lane 的延迟调度"
 * - SyncLane 在 microtask 内立即同步渲染；DefaultLane / TransitionLane / IdleLane 走 setTimeout，
 *   延迟时长仅用于教学可视化，不追求源码精度
 * - 单 root 场景下足够演示 Lane 优先级差异；多 root 仍可工作但未深入测试
 */

import { FiberRootNode } from './fiber';
import {
  type Lane,
  NoLanes,
  SyncLane,
  InputContinuousLane,
  DefaultLane,
  TransitionLane,
  IdleLane,
  getNextLanes,
  includesSyncLane,
  getHighestPriorityLane,
} from '@p-react/shared';

/** 由 workLoop 注入的同步渲染入口；接收 root 与本次要渲染的 lanes */
let performSyncWorkOnRootFn: ((root: FiberRootNode, lanes: Lane) => void) | null = null;

export function setPerformSyncWorkOnRoot(fn: (root: FiberRootNode, lanes: Lane) => void) {
  performSyncWorkOnRootFn = fn;
}

// ── 调度状态 ──────────────────────────────────────────────

/** 当前有待处理更新的 root 集合；flushPendingWork 遍历它 */
const scheduledRoots: Set<FiberRootNode> = new Set();

/** 防止同一 tick 内重复调度 microtask，对应源码 didScheduleMicrotask */
let didScheduleMicrotask: boolean = false;

// ── 公开 API ──────────────────────────────────────────────

/**
 * 标记 root 有更新需要处理，并确保有一个 microtask 会在当前 tick 末处理它
 * 对应源码: ReactFiberRootScheduler.js → ensureRootIsScheduled
 */
export function ensureRootIsScheduled(root: FiberRootNode): void {
  scheduledRoots.add(root);

  if (!didScheduleMicrotask) {
    didScheduleMicrotask = true;
    scheduleMicrotask(flushPendingWork);
  }
}

// ── 内部实现 ──────────────────────────────────────────────

/**
 * 当前 tick 末执行的 flush：遍历所有待处理 root，按优先级分发到同步渲染或延迟渲染
 * 对应源码: ReactFiberRootScheduler.js → processRootScheduleInMicrotask
 */
function flushPendingWork(): void {
  didScheduleMicrotask = false;

  // 复制一份再遍历，避免 processRoot 内部对 Set 增删造成迭代异常
  const roots = Array.from(scheduledRoots);
  for (const root of roots) {
    processRoot(root);
  }
}

/**
 * 对单个 root 做调度决策
 * - SyncLane → 立即同步渲染（microtask 内）
 * - 其他 Lane → setTimeout 延迟渲染
 * 渲染完成后若仍有未完成的 Lane（更高优先级插队或残留低优先级），重新进入调度
 */
function processRoot(root: FiberRootNode): void {
  const nextLanes = getNextLanes(root.pendingLanes);

  if (nextLanes === NoLanes) {
    scheduledRoots.delete(root);
    return;
  }

  if (includesSyncLane(nextLanes)) {
    // SyncLane 在 microtask 内立即同步渲染
    const lanesToRender = getHighestPriorityLane(nextLanes);
    console.log(`[Lane] microtask render: lanes=${getLaneName(lanesToRender)} (0b${lanesToRender.toString(2)})`);
    performSyncWorkOnRootFn!(root, lanesToRender);

    // 渲染可能产生新的更新（render phase setState），或残留更低优先级的 Lane
    // 仍在 scheduledRoots 中（不会被 delete），递归处理直到 NoLanes 或落到非 sync 分支
    processRoot(root);
    return;
  }

  // 非 sync Lane：从 scheduledRoots 移除，交给 setTimeout 延迟调度
  // 若延迟期间有更高优先级插队，ensureRootIsScheduled 会重新加回 Set 并调度 microtask
  scheduledRoots.delete(root);

  const lanesToRender = nextLanes;
  const delay = getLaneDelay(lanesToRender);
  console.log(`[Lane] schedule macrotask: lanes=${getLaneName(lanesToRender)} (0b${lanesToRender.toString(2)}), delay=${delay}ms`);

  setTimeout(() => {
    delayedPerform(root);
  }, delay);
}

/**
 * setTimeout 回调：重新读 pendingLanes（期间可能被更高优先级插队渲染过），
 * 若仍有未完成 Lane，立即同步渲染该 Lane
 */
function delayedPerform(root: FiberRootNode): void {
  const nextLanes = getNextLanes(root.pendingLanes);
  if (nextLanes === NoLanes) {
    return;
  }

  console.log(`[Lane] macrotask render: lanes=${getLaneName(nextLanes)} (0b${nextLanes.toString(2)})`);
  performSyncWorkOnRootFn!(root, nextLanes);

  // 渲染完成后若仍有未完成 Lane，重新进入调度循环
  if (root.pendingLanes !== NoLanes) {
    ensureRootIsScheduled(root);
  }
}

/**
 * 把 Lane 位掩码转换为可读名称，仅用于日志
 */
function getLaneName(lane: Lane): string {
  if (lane === SyncLane) return 'SyncLane';
  if (lane === InputContinuousLane) return 'InputContinuousLane';
  if (lane === DefaultLane) return 'DefaultLane';
  if (lane === TransitionLane) return 'TransitionLane';
  if (lane === IdleLane) return 'IdleLane';
  return 'UnknownLane';
}

/**
 * 不同 Lane 的延迟时长（教学用，非源码值）
 * SyncLane 永远走 microtask 分支，不会到这里；列出只是为了完整性
 */
function getLaneDelay(lane: Lane): number {
  if (lane === SyncLane) return 0;
  if (lane === InputContinuousLane) return 0;
  if (lane === DefaultLane) return 0;
  if (lane === TransitionLane) return 50;
  if (lane === IdleLane) return 200;
  return 0;
}

/**
 * 调度一个 microtask，优先用 queueMicrotask，回退到 Promise.resolve().then
 * 对应源码: scheduleImmediateRootScheduleTask（源码通过 MessageChannel / setImmediate 实现）
 */
function scheduleMicrotask(cb: () => void): void {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(cb);
    return;
  }
  Promise.resolve().then(cb);
}
