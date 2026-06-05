import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from '@p-react/shared';
import { createWorkLoop } from './workLoop';
import type { HostConfig } from './hostConfig';
import type { ReactElement } from '@p-react/shared';

export function createReconciler(hostConfig: HostConfig) {
  const { scheduleUpdateOnFiber } = createWorkLoop(hostConfig);

  function createContainer(container: any): FiberRootNode {
    const hostRootFiber = new FiberNode(HostRoot, {}, null);
    const root = new FiberRootNode(container, hostRootFiber);
    return root;
  }

  function updateContainer(element: ReactElement, root: FiberRootNode) {
    const hostRootFiber = root.current;
    hostRootFiber.pendingProps = {};
    hostRootFiber.memoizedState = element;
    scheduleUpdateOnFiber(hostRootFiber);
  }

  return { createContainer, updateContainer };
}

export { FiberNode, FiberRootNode } from './fiber';
export type { HostConfig } from './hostConfig';
export { useEffect, useState, useReducer, useContext, useLayoutEffect, useInsertionEffect } from './fiberHooks';
export type { Effect } from './fiberHooks';
