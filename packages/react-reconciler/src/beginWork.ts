import { FiberNode } from './fiber';
import { renderWithHooks } from './fiberHooks';
import {
  HostRoot,
  HostComponent,
  HostText,
  FunctionComponent,
  ContextProvider,
  type ReactElement,
  REACT_ELEMENT_TYPE,
  REACT_CONTEXT_TYPE,
  Placement,
  Update,
  ChildDeletion,
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
    case ContextProvider:
      return updateContextProvider(current, workInProgress);
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
 * 处理 ContextProvider（Context.Provider 节点）
 * 将 props.value 写入 context._currentValue，使子树的 useContext 能读取到最新值
 * 对应源码: ReactFiberBeginWork.js → updateContextProvider → pushProvider
 *
 * 简化差异：源码通过 cursor stack（pushProvider/popProvider）在 completeWork 时恢复旧值，
 * 以支持嵌套 Provider。p-react 直接覆写 _currentValue，适用于非嵌套场景。
 */
function updateContextProvider(
  current: FiberNode | null,
  workInProgress: FiberNode
): FiberNode | null {
  const context = workInProgress.type;
  const newValue = workInProgress.pendingProps.value;

  // 将 Provider 的 value 写入 context，子树 useContext 直接读 _currentValue
  context._currentValue = newValue;

  const nextChildren = workInProgress.pendingProps.children;
  reconcileChildren(current, workInProgress, nextChildren);
  return workInProgress.child;
}

/**
 * 协调子节点的分发器，根据是否存在 current 走不同路径：
 * - current === null（首次挂载）→ mountChildFibers，不标记 Placement，由 completeWork 组装子树 DOM
 * - current !== null（更新）→ reconcileChildFibers，对比新旧子节点做 diff
 */
function reconcileChildren(
  current: FiberNode | null,
  workInProgress: FiberNode,
  children: any
) {
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, children);
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      children
    );
  }
}

/**
 * 首次挂载时的子节点处理，不追踪副作用（不打 Placement）
 * 对应源码: ReactChildFiber.js → createChildReconciler(false)
 */
function mountChildFibers(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  newChild: any
): FiberNode | null {
  return reconcileSingleChildImpl(returnFiber, currentFirstChild, newChild, false);
}

/**
 * 更新时的子节点协调，追踪副作用（打 Placement / Update / ChildDeletion）diff算法入口
 * 对应源码: ReactChildFiber.js → createChildReconciler(true)
 */
function reconcileChildFibers(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  newChild: any
): FiberNode | null {
  return reconcileSingleChildImpl(returnFiber, currentFirstChild, newChild, true);
}

/**
 * 单子节点协调的核心实现，shouldTrackEffects 控制是否打副作用标记
 * 对应源码: ReactChildFiber.js → reconcileChildFibersImpl
 */
function reconcileSingleChildImpl(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  newChild: any,
  shouldTrackEffects: boolean
): FiberNode | null {
  if (typeof newChild === 'object' && newChild !== null) {
    if (newChild.$$typeof === REACT_ELEMENT_TYPE) {
      const fiber = reconcileSingleElement(
        returnFiber,
        currentFirstChild,
        newChild,
        shouldTrackEffects
      );
      if (shouldTrackEffects && fiber.flags === NoFlags) {
        // 新建节点才需要 Placement；复用节点已通过 useFiber 打了 Update
        fiber.flags |= Placement;
      }
      return fiber;
    }

    if (Array.isArray(newChild)) {
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, shouldTrackEffects);
    }
  }

  if (typeof newChild === 'string' || typeof newChild === 'number') {
    return reconcileSingleTextNode(returnFiber, currentFirstChild, '' + newChild, shouldTrackEffects);
  }

  // newChild 为 null/undefined 等不可渲染值：删除所有旧子节点
  if (shouldTrackEffects) {
    deleteRemainingChildren(returnFiber, currentFirstChild);
  }
  return null;
}

/**
 * 单 ReactElement 节点的 diff
 * - key + type 均匹配 → useFiber 复用，打 Update，删除多余兄弟
 * - key 匹配但 type 不匹配 → 删除旧节点及其所有兄弟，新建 fiber
 * - key 不匹配 → 删除当前旧节点，继续遍历兄弟
 * 对应源码: ReactChildFiber.js → reconcileSingleElement
 */
function reconcileSingleElement(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  element: ReactElement,
  shouldTrackEffects: boolean
): FiberNode {
  const key = element.key;
  let child = currentFirstChild;

  while (child !== null) {
    if (child.key === key) {
      if (child.type === element.type) {
        // key + type 匹配：复用旧 fiber，删除多余兄弟
        deleteRemainingChildren(returnFiber, child.sibling);
        const existing = useFiber(child, element.props);
        existing.return = returnFiber;
        if (shouldTrackEffects) {
          existing.flags |= Update;
        }
        return existing;
      }
      // key 匹配但 type 不同：无法复用，删除旧节点和所有兄弟
      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      // key 不匹配：删除当前节点，继续遍历兄弟
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }

  // 没有可复用的旧 fiber，新建
  const fiber = createFiberFromElement(element);
  fiber.return = returnFiber;
  return fiber;
}

/**
 * 单文本节点的 diff
 * 若旧节点也是 HostText，复用并打 Update；否则删除旧节点新建文本 fiber
 * 对应源码: ReactChildFiber.js → reconcileSingleTextNode
 */
function reconcileSingleTextNode(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  textContent: string,
  shouldTrackEffects: boolean
): FiberNode {
  if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
    deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
    const existing = useFiber(currentFirstChild, { content: textContent });
    existing.return = returnFiber;
    if (shouldTrackEffects) {
      existing.flags |= Update;
    }
    return existing;
  }

  if (shouldTrackEffects) {
    deleteRemainingChildren(returnFiber, currentFirstChild);
  }
  const fiber = new FiberNode(HostText, { content: textContent }, null);
  fiber.return = returnFiber;
  return fiber;
}

/**
 * 将旧 fiber 标记为待删除，挂入 returnFiber.deletions，并在父节点打 ChildDeletion flag
 * 对应源码: ReactChildFiber.js → deleteChild
 */
function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
  if (returnFiber.deletions === null) {
    returnFiber.deletions = [childToDelete];
    returnFiber.flags |= ChildDeletion;
  } else {
    returnFiber.deletions.push(childToDelete);
  }
}

// 对应源码: ReactChildFiber.js → deleteRemainingChildren
function deleteRemainingChildren(returnFiber: FiberNode, currentFirstChild: FiberNode | null) {
  let childToDelete = currentFirstChild;
  while (childToDelete !== null) {
    deleteChild(returnFiber, childToDelete);
    childToDelete = childToDelete.sibling;
  }
}

/**
 * 复用已有 fiber：clone 其核心字段，重置 index 和 sibling，让 beginWork 按新 props 重新协调
 * 对应源码: ReactChildFiber.js → useFiber（内部调用 createWorkInProgress）
 */
function useFiber(fiber: FiberNode, pendingProps: any): FiberNode {
  const clone = new FiberNode(fiber.tag, pendingProps, fiber.key);
  clone.type = fiber.type;
  clone.stateNode = fiber.stateNode;
  clone.alternate = fiber;
  fiber.alternate = clone;
  clone.memoizedState = fiber.memoizedState;
  clone.memoizedProps = fiber.memoizedProps;
  clone.updateQueue = fiber.updateQueue;
  clone.index = 0;
  clone.sibling = null;
  return clone;
}

/**
 * 多子节点 diff，对应源码: ReactChildFiber.js → reconcileChildrenArray
 *
 * 分三个阶段处理：
 * 1. 顺序遍历新旧节点，按 key 匹配（updateSlot）；key 不匹配时中断
 * 2. 新节点遍历完 → 删除剩余旧节点
 * 3. 旧节点遍历完 → 剩余新节点全部插入
 * 4. 否则把剩余旧节点建成 Map，新节点按 key/index 查找复用
 *
 * placeChild 逻辑：复用节点若 oldIndex >= lastPlacedIndex 则不需移动（不打 Placement），
 * 否则需向后移动（打 Placement）。
 */
function reconcileChildrenArray(
  returnFiber: FiberNode,
  currentFirstChild: FiberNode | null,
  children: any[],
  shouldTrackEffects: boolean
): FiberNode | null {
  let resultingFirstChild: FiberNode | null = null;
  let previousNewFiber: FiberNode | null = null;

  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0;
  let newIdx = 0;
  let nextOldFiber: FiberNode | null = null;

  // 第一轮：按顺序同步遍历新旧节点，key 不匹配则中断
  for (; oldFiber !== null && newIdx < children.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }

    const newFiber = updateSlot(returnFiber, oldFiber, children[newIdx], shouldTrackEffects);
    if (newFiber === null) {
      if (oldFiber === null) oldFiber = nextOldFiber;
      break;
    }

    if (shouldTrackEffects && oldFiber && newFiber.alternate === null) {
      // key 匹配但 type 不同，旧节点已被替换，删除旧节点
      deleteChild(returnFiber, oldFiber);
    }

    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, shouldTrackEffects);

    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }

  // 第二轮：新节点遍历完 → 删除剩余旧节点
  if (newIdx === children.length) {
    if (shouldTrackEffects) {
      deleteRemainingChildren(returnFiber, oldFiber);
    }
    return resultingFirstChild;
  }

  // 第三轮：旧节点遍历完 → 剩余新节点全部插入
  if (oldFiber === null) {
    for (; newIdx < children.length; newIdx++) {
      const newFiber = createChildFiber(returnFiber, children[newIdx]);
      if (!newFiber) continue;
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, shouldTrackEffects);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
    return resultingFirstChild;
  }

  // 第四轮：新旧都有剩余 → 把剩余旧节点建 Map，按 key/index 查找复用
  const existingChildren = mapRemainingChildren(oldFiber);
  for (; newIdx < children.length; newIdx++) {
    const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, children[newIdx], shouldTrackEffects);
    if (!newFiber) continue;
    if (shouldTrackEffects && newFiber.alternate !== null) {
      // 复用了旧 fiber，从 map 中移除，防止被 deleteRemainingChildren 删掉
      const key = newFiber.key !== null ? newFiber.key : newIdx;
      existingChildren.delete(key);
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx, shouldTrackEffects);
    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
  }

  // Map 中剩余未被匹配的旧节点全部删除
  if (shouldTrackEffects) {
    existingChildren.forEach((child) => deleteChild(returnFiber, child));
  }

  return resultingFirstChild;
}

/**
 * 按 key 匹配新旧节点，类型相同则复用（返回 wip fiber），key 不匹配返回 null
 * 对应源码: ReactChildFiber.js → updateSlot
 */
function updateSlot(
  returnFiber: FiberNode,
  oldFiber: FiberNode | null,
  newChild: any,
  shouldTrackEffects: boolean
): FiberNode | null {
  const key = oldFiber !== null ? oldFiber.key : null;

  if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
    // 文本节点没有 key，key 不为 null 的旧节点不能匹配文本
    if (key !== null) return null;
    return updateTextNode(returnFiber, oldFiber, '' + newChild, shouldTrackEffects);
  }

  if (typeof newChild === 'object' && newChild !== null && newChild.$$typeof === REACT_ELEMENT_TYPE) {
    if (newChild.key !== key) return null;
    return updateElement(returnFiber, oldFiber, newChild, shouldTrackEffects);
  }

  return null;
}

/**
 * 复用文本节点，或在类型不符时新建
 * 对应源码: ReactChildFiber.js → updateTextNode
 */
function updateTextNode(
  returnFiber: FiberNode,
  current: FiberNode | null,
  textContent: string,
  shouldTrackEffects: boolean
): FiberNode {
  if (current !== null && current.tag === HostText) {
    const existing = useFiber(current, { content: textContent });
    existing.return = returnFiber;
    if (shouldTrackEffects) existing.flags |= Update;
    return existing;
  }
  const created = new FiberNode(HostText, { content: textContent }, null);
  created.return = returnFiber;
  return created;
}

/**
 * 复用 ReactElement 对应的旧 fiber（type 相同时），或新建
 * 对应源码: ReactChildFiber.js → updateElement
 */
function updateElement(
  returnFiber: FiberNode,
  current: FiberNode | null,
  element: ReactElement,
  shouldTrackEffects: boolean
): FiberNode {
  if (current !== null && current.type === element.type) {
    const existing = useFiber(current, element.props);
    existing.return = returnFiber;
    if (shouldTrackEffects) existing.flags |= Update;
    return existing;
  }
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}

/**
 * 将旧节点的剩余部分建成 key → fiber 的 Map，供第四轮 O(1) 查找
 * 对应源码: ReactChildFiber.js → mapRemainingChildren
 */
function mapRemainingChildren(currentFirstChild: FiberNode): Map<string | number, FiberNode> {
  const map = new Map<string | number, FiberNode>();
  let existing: FiberNode | null = currentFirstChild;
  while (existing !== null) {
    map.set(existing.key !== null ? existing.key : existing.index, existing);
    existing = existing.sibling;
  }
  return map;
}

/**
 * 从 existingChildren Map 中查找可复用的旧 fiber
 * 对应源码: ReactChildFiber.js → updateFromMap
 */
function updateFromMap(
  existingChildren: Map<string | number, FiberNode>,
  returnFiber: FiberNode,
  newIdx: number,
  newChild: any,
  shouldTrackEffects: boolean
): FiberNode | null {
  if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
    const matchedFiber = existingChildren.get(newIdx) ?? null;
    return updateTextNode(returnFiber, matchedFiber, '' + newChild, shouldTrackEffects);
  }

  if (typeof newChild === 'object' && newChild !== null && newChild.$$typeof === REACT_ELEMENT_TYPE) {
    const key = newChild.key !== null ? newChild.key : newIdx;
    const matchedFiber = existingChildren.get(key) ?? null;
    return updateElement(returnFiber, matchedFiber, newChild, shouldTrackEffects);
  }

  return null;
}

/**
 * 决定新 fiber 是否需要打 Placement（需要移动或插入到 DOM）
 * 复用的旧节点：若 oldIndex >= lastPlacedIndex，原位不动；否则需向后移动，打 Placement
 * 新建节点：总是打 Placement
 * 对应源码: ReactChildFiber.js → placeChild
 */
function placeChild(
  newFiber: FiberNode,
  lastPlacedIndex: number,
  newIndex: number,
  shouldTrackEffects: boolean
): number {
  newFiber.index = newIndex;
  if (!shouldTrackEffects) return lastPlacedIndex;

  const current = newFiber.alternate;
  if (current !== null) {
    const oldIndex = current.index;
    if (oldIndex < lastPlacedIndex) {
      // 旧节点位于已处理节点之前，需要向后移动
      newFiber.flags |= Placement;
      return lastPlacedIndex;
    }
    return oldIndex;
  }

  // 没有旧节点 → 纯插入
  newFiber.flags |= Placement;
  return lastPlacedIndex;
}

/**
 * 根据 child 的类型创建对应的 fiber 节点（不做 diff，仅用于数组内新建场景）
 * - ReactElement → createFiberFromElement
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
  }

  if (typeof child === 'string' || typeof child === 'number') {
    const fiber = new FiberNode(HostText, { content: '' + child }, null);
    fiber.return = returnFiber;
    return fiber;
  }

  return null;
}

/**
 * 从 ReactElement 创建 fiber 节点
 * 根据 element.type 判断 tag：字符串（如 'div'）→ HostComponent，函数 → FunctionComponent，
 * Context（$$typeof === REACT_CONTEXT_TYPE）→ ContextProvider
 */
function createFiberFromElement(element: ReactElement): FiberNode {
  const { type, key, props } = element;
  let tag: any;

  if (typeof type === 'string') {
    tag = HostComponent;
  } else if (typeof type === 'function') {
    tag = FunctionComponent;
  } else if (
    typeof type === 'object' &&
    type !== null &&
    (type as any).$$typeof === REACT_CONTEXT_TYPE
  ) {
    // Context.Provider — type 是 context 对象自身（Provider === context）
    tag = ContextProvider;
  } else {
    tag = HostComponent;
  }

  const fiber = new FiberNode(tag, props, key);
  fiber.type = type;
  return fiber;
}
