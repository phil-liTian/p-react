import { FiberNode } from './fiber';
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  Placement,
  Update,
  ChildDeletion,
  PassiveEffect,
  NoFlags,
  HookHasEffect,
  HookPassive,
} from '@p-react/shared';
import type { HostConfig } from './hostConfig';
import type { Effect } from './fiberHooks';

export function createCommitWork(hostConfig: HostConfig) {
  const { appendChildToContainer, commitUpdate, commitTextUpdate, removeChild } = hostConfig;

  function commitRoot(finishedWork: FiberNode, container: any) {
    commitMutationEffects(finishedWork, container);
    // 异步调度 passive effects (useEffect)
    schedulePassiveEffects(finishedWork);
  }

  /**
   * mutation 阶段的入口，深度优先遍历 fiber 树：
   * 1. 先处理 ChildDeletion（deletions 数组）—— 删除旧节点
   * 2. 再递归处理子节点
   * 3. 最后处理当前节点的 Placement / Update
   * 对应源码: ReactFiberCommitWork.js → recursivelyTraverseMutationEffects + commitReconciliationEffects
   */
  function commitMutationEffects(fiber: FiberNode, container: any) {
    // 先处理当前节点上挂载的 deletions（删除已卸载的旧子节点）
    if (fiber.deletions !== null) {
      for (const childToDelete of fiber.deletions) {
        commitDeletion(childToDelete, container);
      }
      fiber.deletions = null;
    }

    if (fiber.child) {
      commitMutationEffects(fiber.child, container);
    }
    if (fiber.sibling) {
      commitMutationEffects(fiber.sibling, container);
    }

    if (fiber.flags & Placement) {
      commitPlacement(fiber, container);
      fiber.flags &= ~Placement;
    }

    if (fiber.flags & Update) {
      commitUpdateEffects(fiber);
      fiber.flags &= ~Update;
    }
  }

  /**
   * 处理 Update flag：根据节点类型调用对应的 DOM 更新方法
   * 对应源码: ReactFiberCommitWork.js → commitMutationEffectsOnFiber → HostComponent/HostText 分支
   */
  function commitUpdateEffects(fiber: FiberNode) {
    switch (fiber.tag) {
      case HostComponent: {
        const instance = fiber.stateNode;
        const current = fiber.alternate;
        if (instance != null && current !== null) {
          commitUpdate(instance, current.memoizedProps, fiber.memoizedProps);
        }
        break;
      }
      case HostText: {
        const textInstance = fiber.stateNode;
        const newText = fiber.memoizedProps?.content ?? '';
        commitTextUpdate(textInstance, newText);
        break;
      }
    }
  }

  /**
   * 递归删除 fiber 及其子树对应的 DOM 节点
   * 向下穿透，找到所有宿主节点（HostComponent / HostText）并从父 DOM 移除
   * 对应源码: ReactFiberCommitWork.js → commitDeletionEffects → unmountHostComponents
   */
  function commitDeletion(fiber: FiberNode, container: any) {
    const parentFiber = getHostParentFiber(fiber);
    const parentDom = getHostParentDom(parentFiber, container);
    unmountFiberTree(fiber, parentDom);
  }

  function unmountFiberTree(fiber: FiberNode, parentDom: any) {
    if (fiber.tag === HostComponent || fiber.tag === HostText) {
      removeChild(parentDom, fiber.stateNode);
      return;
    }
    if (fiber.child) {
      unmountFiberTree(fiber.child, parentDom);
    }
    if (fiber.sibling) {
      unmountFiberTree(fiber.sibling, parentDom);
    }
  }

  function commitPlacement(fiber: FiberNode, container: any) {
    const parentFiber = getHostParentFiber(fiber);
    const parentDom = getHostParentDom(parentFiber, container);

    if (fiber.tag === HostComponent || fiber.tag === HostText) {
      appendChildToContainer(parentDom, fiber.stateNode);
      return;
    }

    // FunctionComponent 自身没有 DOM，向下穿透找到所有直接宿主子节点逐一插入
    let node: FiberNode | null = fiber.child;
    while (node !== null) {
      if (node.tag === HostComponent || node.tag === HostText) {
        appendChildToContainer(parentDom, node.stateNode);
      } else if (node.child !== null) {
        node = node.child;
        continue;
      }
      if (node === fiber) return;
      while (node.sibling === null) {
        if (node.return === null || node.return === fiber) return;
        node = node.return;
      }
      node = node.sibling;
    }
  }

  function getHostParentFiber(fiber: FiberNode): FiberNode {
    let parent = fiber.return;
    while (parent !== null) {
      if (parent.tag === HostComponent || parent.tag === HostRoot) {
        return parent;
      }
      parent = parent.return;
    }
    return fiber;
  }

  function getHostParentDom(parentFiber: FiberNode, container: any): any {
    if (parentFiber.tag === HostRoot) {
      return container;
    }
    return parentFiber.stateNode;
  }

  /**
   * 收集并异步执行 passive effects
   * 对应源码: flushPassiveEffects (ReactFiberWorkLoop.js)
   * 真实 React 用 Scheduler 调度，这里简化为 setTimeout 模拟异步
   */
  function schedulePassiveEffects(fiber: FiberNode) {
    const pendingEffects: Effect[] = [];
    collectPassiveEffects(fiber, pendingEffects);

    if (pendingEffects.length > 0) {
      setTimeout(() => {
        pendingEffects.forEach((effect) => {
          const destroy = effect.create();
          effect.destroy = destroy === undefined ? undefined : destroy;
        });

        pendingEffects.forEach((effect) => {
          if (effect.destroy) {
            effect.destroy();
          }
        });
      });
    }
  }

  function collectPassiveEffects(fiber: FiberNode, effects: Effect[]) {
    if (fiber.tag === FunctionComponent && fiber.flags & PassiveEffect) {
      const updateQueue = fiber.updateQueue as { lastEffect: Effect | null } | null;
      if (updateQueue && updateQueue.lastEffect) {
        const lastEffect = updateQueue.lastEffect;
        let effect = lastEffect.next!;
        do {
          if ((effect.tag & HookPassive) && (effect.tag & HookHasEffect)) {
            effects.push(effect);
          }
          effect = effect.next!;
        } while (effect !== lastEffect.next);
      }
      fiber.flags &= ~PassiveEffect;
    }

    if (fiber.child) collectPassiveEffects(fiber.child, effects);
    if (fiber.sibling) collectPassiveEffects(fiber.sibling, effects);
  }

  return commitRoot;
}
