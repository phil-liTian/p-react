import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot, NoFlags } from '@p-react/shared';
import { beginWork } from './beginWork';
import { createCompleteWork } from './completeWork';
import { createCommitWork } from './commitWork';
import { setScheduleUpdateOnFiber } from './fiberHooks';
import type { HostConfig } from './hostConfig';

/**
 * workLoop: 渲染主循环
 * 对应源码: ReactFiberWorkLoop.js
 *
 * 1. performUnitOfWork 驱动 beginWork (递) 和 completeWork (归)
 * 2. 构建完成后调用 commitRoot 将变更应用到 DOM
 */
export function createWorkLoop(hostConfig: HostConfig) {
  const completeWork = createCompleteWork(hostConfig);
  const commitRoot = createCommitWork(hostConfig);

  /** 当前正在处理的 Fiber 节点指针，遍历过程中不断移动，为 null 时表示整棵树处理完毕 */
  let workInProgress: FiberNode | null = null;

  /**
   * 调度更新的统一入口
   * 无论是首次 render 还是后续 setState，都通过此函数触发渲染流程：
   * 先从触发更新的 fiber 向上找到根节点，再从根节点启动同步渲染
   */
  function scheduleUpdateOnFiber(fiber: FiberNode) {
    const root = markUpdateFromFiberToRoot(fiber);
    if (root) {
      performSyncWorkOnRoot(root);
    }
  }

  // 注入 scheduleUpdateOnFiber 到 fiberHooks，使 dispatchSetState 可以触发更新
  setScheduleUpdateOnFiber(scheduleUpdateOnFiber);

  /**
   * 从任意 fiber 节点沿 return 指针向上遍历，找到 FiberRootNode
   * 更新可以从树中任意节点发起，但渲染必须从根节点开始，所以需要这个"寻根"过程
   * React 源码中此函数还会沿途更新 childLanes，p-react 省略了 Lane 模型
   */
  function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
    let node = fiber;
    while (node.return) {
      node = node.return;
    }
    if (node.tag === HostRoot) {
      return node.stateNode as FiberRootNode;
    }
    return null;
  }

  /**
   * 同步渲染的完整流程，串联 render 阶段和 commit 阶段：
   * 1. prepareFreshStack — 初始化 workInProgress 双缓冲树
   * 2. workLoopSync — 深度优先遍历，构建完整的 wip 树
   * 3. commitRoot — 将 wip 树的变更同步到真实 DOM
   */
  function performSyncWorkOnRoot(root: FiberRootNode) {
    prepareFreshStack(root);
    workLoopSync();

    const finishedWork = root.current.alternate;
    if (finishedWork) {
      root.finishedWork = finishedWork;
      commitRoot(finishedWork, root.container);
      // 双缓冲切换：wip 树变为 current 树，下次更新时基于它创建新的 wip
      root.current = finishedWork;
      root.finishedWork = null;
    }
  }

  /**
   * 为新一轮渲染准备"干净的工作栈"
   * 基于 current 树的根 fiber 创建（或复用）wip 根 fiber，将其设为 workInProgress 起点
   */
  function prepareFreshStack(root: FiberRootNode) {
    const wip = createWorkInProgress(root.current);
    workInProgress = wip;
  }

  /**
   * 双缓冲的核心：基于 current fiber 创建或复用对应的 wip fiber
   * - 首次渲染：alternate 为 null，新建 wip fiber 并通过 alternate 互相关联
   * - 后续更新：复用已有的 alternate，仅更新 pendingProps
   * 两种情况都会同步 memoizedProps、memoizedState、child，
   * 后续 beginWork 会根据新 props 重新协调子节点
   */
  function createWorkInProgress(current: FiberNode): FiberNode {
    let wip = current.alternate;
    if (wip === null) {
      wip = new FiberNode(current.tag, current.pendingProps, current.key);
      wip.type = current.type;
      wip.stateNode = current.stateNode;
      wip.alternate = current;
      current.alternate = wip;
    } else {
      wip.pendingProps = current.pendingProps;
    }
    wip.memoizedProps = current.memoizedProps;
    wip.memoizedState = current.memoizedState;
    wip.updateQueue = current.updateQueue;
    wip.child = current.child;
    wip.flags = NoFlags;
    wip.subtreeFlags = NoFlags;
    return wip;
  }

  /**
   * 同步工作循环：不断取出 workInProgress 执行，直到整棵树遍历完毕
   * React 并发模式下多一个 shouldYield() 判断来实现时间切片，p-react 只做同步版本
   */
  function workLoopSync() {
    while (workInProgress !== null) {
      performUnitOfWork(workInProgress);
    }
  }

  /**
   * 处理单个工作单元，是"递"和"归"的分叉点：
   * 1. 调用 beginWork 处理当前节点并返回第一个子 fiber
   * 2. 将 pendingProps 记录到 memoizedProps（标记 props 已处理）
   * 3. 有子节点 → workInProgress 向下移动，继续"递"
   *    无子节点 → 进入 completeUnitOfWork 开始"归"
   */
  function performUnitOfWork(unitOfWork: FiberNode) {
    const current = unitOfWork.alternate;
    const next = beginWork(current, unitOfWork);
    unitOfWork.memoizedProps = unitOfWork.pendingProps;

    if (next === null) {
      completeUnitOfWork(unitOfWork);
    } else {
      workInProgress = next;
    }
  }

  /**
   * "归"阶段：从叶子节点自底向上处理
   * 1. 调用 completeWork 创建 DOM 实例、收集子节点、冒泡 subtreeFlags
   * 2. 有兄弟节点 → workInProgress 切到兄弟，return 回到 workLoopSync 对兄弟进行"递"
   *    无兄弟节点 → 向上回到父节点继续"归"
   * 3. 归到根节点（return 为 null）→ workInProgress 置 null，workLoopSync 循环结束
   */
  function completeUnitOfWork(unitOfWork: FiberNode) {
    let completedWork: FiberNode | null = unitOfWork;
    while (completedWork !== null) {
      completeWork(completedWork);
      const siblingFiber = completedWork.sibling;
      if (siblingFiber !== null) {
        workInProgress = siblingFiber;
        return;
      }
      completedWork = completedWork.return;
    }
    workInProgress = null;
  }

  return { scheduleUpdateOnFiber };
}
