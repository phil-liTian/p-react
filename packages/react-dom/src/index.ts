/*
 * @Author: phil
 * @Date: 2026-05-22 15:56:07
 */
import { createReconciler, type FiberRootNode } from '@p-react/react-reconciler';
import { DOMHostConfig } from './hostConfig';
import type { ReactElement } from '@p-react/shared';

const { createContainer, updateContainer } = createReconciler(DOMHostConfig);

export interface Root {
  render(element: ReactElement): void;
}

export function createRoot(container: HTMLElement): Root {
  const root: FiberRootNode = createContainer(container);

  return {
    render(element: ReactElement) {
      updateContainer(element, root);
    },
  };
}
