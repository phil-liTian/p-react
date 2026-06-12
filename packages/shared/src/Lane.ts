/**
 * Lane: 优先级位掩码模型
 * 对应源码: ReactFiberLane.js
 *
 * 与源码的主要差异：
 * - 省略了 Hydration Lane、Retry Lane、Offscreen Lane 等高级 Lane
 * - 省略了 entanglement（关联 Lane）、expiration time 等复杂机制
 * - 只保留 SyncLane / InputContinuousLane / DefaultLane / TransitionLane / IdleLane 五档优先级
 * - 所有位运算工具函数与源码保持一致
 */

export type Lane = number;
export type Lanes = number;

// ── Lane 常量定义 ──────────────────────────────────────────────
// 数值越小（bit 越靠右）优先级越高
// 对应源码: ReactFiberLane.js

export const NoLane: Lane =   /*                */ 0b00000000000000000000000000000000;
export const NoLanes: Lanes = /*                */ 0b00000000000000000000000000000000;

/** 同步优先级，最高，对应用户点击等紧急交互 */
export const SyncLane: Lane =              /*   */ 0b00000000000000000000000000000010;

/** 连续输入优先级，对应 onInput、onScroll 等持续触发事件 */
export const InputContinuousLane: Lane =   /*   */ 0b00000000000000000000000000001000;

/** 默认优先级，普通 setState 默认使用此 Lane */
export const DefaultLane: Lane =           /*   */ 0b00000000000000000000000000100000;

/** Transition 优先级，useTransition / startTransition 标记的更新 */
export const TransitionLane: Lane =        /*   */ 0b00000000000000000000000100000000;

/** 空闲优先级，最低，不紧急的后台任务 */
export const IdleLane: Lane =              /*   */ 0b00100000000000000000000000000000;

// ── 位运算工具函数 ──────────────────────────────────────────────
// 对应源码: ReactFiberLane.js，函数名与源码保持一致

/**
 * 合并两组 Lane（按位 OR）
 * 对应源码: ReactFiberLane.js → mergeLanes
 */
export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
  return a | b;
}

/**
 * 从集合中移除指定 Lane（按位 AND NOT）
 * 对应源码: ReactFiberLane.js → removeLanes
 */
export function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes {
  return set & ~subset;
}

/**
 * 判断两组 Lane 是否有交集（按位 AND）
 * 对应源码: ReactFiberLane.js → includesSomeLane
 */
export function includesSomeLane(a: Lanes | Lane, b: Lanes | Lane): boolean {
  return (a & b) !== NoLanes;
}

/**
 * 判断 subset 是否是 set 的子集
 * 对应源码: ReactFiberLane.js → isSubsetOfLanes
 */
export function isSubsetOfLanes(set: Lanes, subset: Lanes | Lane): boolean {
  return (set & subset) === subset;
}

/**
 * 取优先级最高的单个 Lane（最低位，即最右边的 1-bit）
 * lanes & -lanes 利用补码特性，精确提取最低有效位
 * 对应源码: ReactFiberLane.js → getHighestPriorityLane
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}

/**
 * 将 root.pendingLanes 中优先级最高的 Lane 集合作为本次渲染目标
 * 简化版：直接取最高优先级单个 Lane（源码中有更复杂的批量 Lane 逻辑）
 * 对应源码: ReactFiberLane.js → getNextLanes
 */
export function getNextLanes(pendingLanes: Lanes): Lanes {
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }
  return getHighestPriorityLane(pendingLanes);
}

/**
 * 将 root.pendingLanes 中加入新 Lane，并清空因新更新而不再需要挂起的状态
 * 对应源码: ReactFiberLane.js → markRootUpdated
 */
export function markRootUpdated(pendingLanes: Lanes, updateLane: Lane): Lanes {
  return pendingLanes | updateLane;
}

/**
 * 渲染完成后从 pendingLanes 中移除已处理的 Lane
 * 对应源码: ReactFiberLane.js → markRootFinished（简化版）
 */
export function markRootFinished(pendingLanes: Lanes, finishedLanes: Lanes): Lanes {
  return removeLanes(pendingLanes, finishedLanes);
}
