import { FiberNode } from './fiber';
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  NoFlags,
} from '@p-react/shared';
import type { HostConfig } from './hostConfig';

/**
 * completeWork: 归阶段 - 自底向上创建 DOM 实例，收集子树 flags
 * 对应源码: ReactFiberCompleteWork.js
 */
export function createCompleteWork(hostConfig: HostConfig) {
  const { createInstance, createTextInstance, appendInitialChild } = hostConfig;

  /**
   * 归阶段的核心处理函数，根据 fiber.tag 执行不同操作：
   * - HostComponent：创建真实 DOM 元素，将子节点的 DOM 追加进去，挂到 stateNode
   * - HostText：创建文本节点，挂到 stateNode
   * - HostRoot / FunctionComponent：无需创建 DOM，跳过
   * 最后调用 bubbleProperties 将子树的副作用标记冒泡到当前节点
   */
  function completeWork(workInProgress: FiberNode): void {
    const newProps = workInProgress.pendingProps;

    switch (workInProgress.tag) {
      case HostComponent: {
        const instance = createInstance(workInProgress.type, newProps);
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
        break;
      }
      case HostText: {
        const textContent = newProps.content as string;
        const instance = createTextInstance(textContent);
        workInProgress.stateNode = instance;
        break;
      }
      case HostRoot:
      case FunctionComponent:
        break;
    }

    bubbleProperties(workInProgress);
  }

  /**
   * 将当前 fiber 的所有"宿主子孙节点"的 DOM 追加到 parent 中
   * 遍历逻辑会跳过非宿主节点（如 FunctionComponent），
   * 向下穿透直到找到 HostComponent 或 HostText，再将其 stateNode 追加到 parent
   * 这样即使组件嵌套多层函数组件，最终 DOM 结构仍然是扁平正确的
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
   * 这样 commit 阶段只需检查 subtreeFlags 就能知道子树中是否存在待处理的副作用，
   * 避免遍历整棵树，实现快速跳过无变更的子树
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
