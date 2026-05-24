import { FiberNode } from './fiber';
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  Placement,
  PassiveEffect,
  NoFlags,
  HookHasEffect,
  HookPassive,
} from '@p-react/shared';
import type { HostConfig } from './hostConfig';
import type { Effect } from './fiberHooks';

export function createCommitWork(hostConfig: HostConfig) {
  const { appendChildToContainer } = hostConfig;

  function commitRoot(finishedWork: FiberNode, container: any) {
    commitMutationEffects(finishedWork, container);
    // 异步调度 passive effects (useEffect)
    schedulePassiveEffects(finishedWork);
  }

  function commitMutationEffects(fiber: FiberNode, container: any) {
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
  }

  function commitPlacement(fiber: FiberNode, container: any) {
    if (fiber.tag === HostComponent || fiber.tag === HostText) {
      const parentFiber = getHostParentFiber(fiber);
      const parentDom = getHostParentDom(parentFiber, container);
      appendChildToContainer(parentDom, fiber.stateNode);
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
        // 先执行所有 destroy（上一轮的 cleanup）
        // pendingEffects.forEach((effect) => {
        //   if (effect.destroy) {
        //     effect.destroy();
        //   }
        // });
        // 再执行所有 create
        pendingEffects.forEach((effect) => {
          const destroy = effect.create();
          effect.destroy = destroy === undefined ? undefined : destroy;
        });

        // 先执行所有 destroy（上一轮的 cleanup）
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
