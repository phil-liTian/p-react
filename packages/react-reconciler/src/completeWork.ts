import { FiberNode } from './fiber';
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  NoFlags,
  Update,
} from '@p-react/shared';
import type { HostConfig } from './hostConfig';

/**
 * completeWork: 归阶段 - 自底向上创建 DOM 实例，收集子树 flags
 * 对应源码: ReactFiberCompleteWork.js
 */
export function createCompleteWork(hostConfig: HostConfig) {
  const { createInstance, createTextInstance, appendInitialChild } = hostConfig;

  /**
   * 归阶段的核心处理函数，根据 fiber.tag 和 current 是否存在走不同分支：
   * - mount（current === null 或无 stateNode）：创建真实 DOM 实例，挂到 stateNode
   * - update（current !== null 且 stateNode 已存在）：复用 stateNode，对比 props 打 Update flag
   * 最后调用 bubbleProperties 将子树的副作用标记冒泡到当前节点
   */
  function completeWork(workInProgress: FiberNode): void {
    const newProps = workInProgress.pendingProps;
    const current = workInProgress.alternate;

    switch (workInProgress.tag) {
      case HostComponent: {
        if (current !== null && workInProgress.stateNode != null) {
          // update 阶段：复用已有 DOM 节点，比较 props 差异
          updateHostComponent(current, workInProgress, newProps);
        } else {
          // mount 阶段：创建 DOM 节点并组装子树
          const instance = createInstance(workInProgress.type, newProps);
          appendAllChildren(instance, workInProgress);
          workInProgress.stateNode = instance;
        }
        break;
      }
      case HostText: {
        const newText = newProps.content as string;
        if (current !== null && workInProgress.stateNode != null) {
          // update 阶段：对比内容，有变化才打 Update flag
          const oldText = current.memoizedProps?.content as string;
          if (oldText !== newText) {
            workInProgress.flags |= Update;
          }
          // 复用旧 stateNode
          workInProgress.stateNode = current.stateNode;
        } else {
          workInProgress.stateNode = createTextInstance(newText);
        }
        break;
      }
      case HostRoot:
      case FunctionComponent:
        break;
    }

    bubbleProperties(workInProgress);
  }

  /**
   * HostComponent 的 update 分支：复用 current.stateNode，对比新旧 props
   * 有差异则在 wip 上打 Update flag，commit 阶段再通过 commitUpdate 真正修改 DOM
   * 对应源码: ReactFiberCompleteWork.js → prepareToHydrateHostInstance / markUpdate
   */
  function updateHostComponent(
    current: FiberNode,
    workInProgress: FiberNode,
    newProps: any
  ) {
    workInProgress.stateNode = current.stateNode;
    const oldProps = current.memoizedProps;
    if (oldProps !== newProps) {
      workInProgress.flags |= Update;
    }
  }

  /**
   * 将当前 fiber 的所有"宿主子孙节点"的 DOM 追加到 parent 中
   * 遍历逻辑会跳过非宿主节点（如 FunctionComponent），
   * 向下穿透直到找到 HostComponent 或 HostText，再将其 stateNode 追加到 parent
   */
  function appendAllChildren(parent: any, workInProgress: FiberNode) {
    let node = workInProgress.child;
    while (node !== null) {
      if (node.tag === HostComponent || node.tag === HostText) {
        appendInitialChild(parent, node.stateNode);
      } else if (node.child !== null) {
        node.child.return = node;
        node = node.child;
        continue;
      }

      if (node === workInProgress) return;

      while (node.sibling === null) {
        if (node.return === null || node.return === workInProgress) return;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }

  /**
   * 副作用冒泡：遍历所有子 fiber，将它们的 flags 和 subtreeFlags 合并到当前节点的 subtreeFlags
   * commit 阶段只需检查 subtreeFlags 就能知道子树中是否存在待处理的副作用
   */
  function bubbleProperties(fiber: FiberNode) {
    let subtreeFlags = NoFlags;
    let child = fiber.child;
    while (child !== null) {
      subtreeFlags |= child.subtreeFlags;
      subtreeFlags |= child.flags;
      child.return = fiber;
      child = child.sibling;
    }
    fiber.subtreeFlags |= subtreeFlags;
  }

  return completeWork;
}
