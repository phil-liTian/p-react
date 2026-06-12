import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot, SyncLane } from '@p-react/shared';
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
    // 首次 render 使用 SyncLane，保证同步渲染
    scheduleUpdateOnFiber(hostRootFiber, SyncLane);
  }

  return { createContainer, updateContainer };
}

export { FiberNode, FiberRootNode } from './fiber';
export type { HostConfig } from './hostConfig';
export { useEffect, useState, useReducer, useContext, useLayoutEffect, useInsertionEffect, useRef, useImperativeHandle, useMemo, useCallback, useId, useTransition, useStateWithLane } from './fiberHooks';
export type { Effect } from './fiberHooks';
