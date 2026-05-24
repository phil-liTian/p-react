import { FiberNode } from './fiber';
import { renderWithHooks } from './fiberHooks';
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  type ReactElement,
  REACT_ELEMENT_TYPE,
  Placement,
  NoFlags,
} from '@p-react/shared';

/**
 * beginWork: 递阶段 - 根据 fiber.tag 分发处理，创建子 fiber 节点
 * 对应源码: ReactFiberBeginWork.js
 *
 * current: 已渲染到屏幕上的 fiber (首次渲染时除 hostRootFiber 外都为 null)
 * workInProgress: 正在构建的 fiber
 */
export function beginWork(
  current: FiberNode | null,
  workInProgress: FiberNode
): FiberNode | null {
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress);
    case HostComponent:
      return updateHostComponent(current, workInProgress);
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress);
    case HostText:
      return null;
    default:
      return null;
  }
}

/**
 * 处理 HostRoot（根节点）
 * 子节点来源：memoizedState，即 render(element) 时传入的 ReactElement
 */
function updateHostRoot(
  current: FiberNode | null,
  workInProgress: FiberNode
): FiberNode | null {
  const nextChildren = workInProgress.memoizedState;
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 处理 HostComponent（原生 DOM 元素，如 div、span）
 * 子节点来源：pendingProps.children，即 JSX 中嵌套的子元素
 */
function updateHostComponent(
  current: FiberNode | null,
  workInProgress: FiberNode
): FiberNode | null {
  const nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 处理 FunctionComponent（函数组件）
 * 执行组件函数拿到返回的 ReactElement 作为子节点
 */
function updateFunctionComponent(
  current: FiberNode | null,
  workInProgress: FiberNode
): FiberNode | null {
  const Component = workInProgress.type;
  const nextChildren = renderWithHooks(current, workInProgress, Component, workInProgress.pendingProps);
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 协调子节点的分发器，根据是否存在 current 走不同路径：
 * - current === null（首次挂载）→ mountChildFibers，子节点标记 Placement
 * - current !== null（更新）→ reconcileChildFibers，对比新旧子节点做 diff
 */
function reconcileChildren(
  current: FiberNode | null,
  workInProgress: FiberNode,
  children: any
) {
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, children);
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      children
    );
  }
}

/**
 * 首次挂载时的子节点处理
 * 创建子 fiber 并标记 Placement，commit 阶段会将其插入 DOM
 */
function mountChildFibers(
  returnFiber: FiberNode,
  children: any
): FiberNode | null {
  const child = createChildFiber(returnFiber, children);
  if (child) {
    child.flags |= Placement;
  }
  return child;
}

/**
 * 更新时的子节点协调
 * 当前实现与 mount 逻辑相同（均标记 Placement），
 * 后续完善 diff 算法后会在此处复用已有 fiber 并精确标记变更
 */
function reconcileChildFibers(
  returnFiber: FiberNode,
  currentChild: FiberNode | null,
  newChild: any
): FiberNode | null {
  const child = createChildFiber(returnFiber, newChild);
  if (child) {
    child.flags |= Placement;
  }
  return child;
}

/**
 * 根据 child 的类型创建对应的 fiber 节点：
 * - ReactElement（$$typeof === REACT_ELEMENT_TYPE）→ createFiberFromElement
 * - 数组 → reconcileChildrenArray，构建兄弟链表
 * - 字符串/数字 → 创建 HostText fiber
 * - 其他 → 返回 null（不可渲染的类型）
 */
function createChildFiber(
  returnFiber: FiberNode,
  child: any
): FiberNode | null {
  if (typeof child === 'object' && child !== null) {
    if (child.$$typeof === REACT_ELEMENT_TYPE) {
      const fiber = createFiberFromElement(child);
      fiber.return = returnFiber;
      return fiber;
    }

    if (Array.isArray(child)) {
      return reconcileChildrenArray(returnFiber, child);
    }
  }

  if (typeof child === 'string' || typeof child === 'number') {
    const fiber = new FiberNode(HostText, { content: '' + child }, null);
    fiber.return = returnFiber;
    return fiber;
  }

  return null;
}

/**
 * 处理子节点为数组的情况（如 JSX 中的 {list.map(...)}）
 * 遍历数组，为每个元素创建 fiber，通过 sibling 指针串成链表
 * 返回第一个子 fiber（firstChild），后续兄弟通过 sibling 链可达
 */
function reconcileChildrenArray(
  returnFiber: FiberNode,
  children: any[]
): FiberNode | null {
  let firstChild: FiberNode | null = null;
  let prevSibling: FiberNode | null = null;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const fiber = createChildFiber(returnFiber, child);
    if (!fiber) continue;

    fiber.index = i;
    fiber.flags |= Placement;

    if (firstChild === null) {
      firstChild = fiber;
    } else if (prevSibling) {
      prevSibling.sibling = fiber;
    }
    prevSibling = fiber;
  }

  return firstChild;
}

/**
 * 从 ReactElement 创建 fiber 节点
 * 根据 element.type 判断 tag：字符串（如 'div'）→ HostComponent，函数 → FunctionComponent
 */
function createFiberFromElement(element: ReactElement): FiberNode {
  const { type, key, props } = element;
  let tag: any;

  if (typeof type === 'string') {
    tag = HostComponent;
  } else if (typeof type === 'function') {
    tag = FunctionComponent;
  } else {
    tag = HostComponent;
  }

  const fiber = new FiberNode(tag, props, key);
  fiber.type = type;
  return fiber;
}
