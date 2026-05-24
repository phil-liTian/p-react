import type { Key, Ref, Props, ReactElement } from '@p-react/shared';
import { type WorkTag, type Flags, NoFlags } from '@p-react/shared';

export class FiberNode {
  /** 节点类型标识，如 HostRoot、HostComponent、FunctionComponent、HostText 等 */
  tag: WorkTag;
  /** 用于 diff 时识别同级节点的唯一标识，对应 JSX 中的 key 属性 */
  key: Key;
  /** 节点对应的实际类型：函数组件是函数本身，原生组件是标签名字符串（如 'div'） */
  type: any;
  /** 节点对应的实例：HostComponent 指向真实 DOM 节点，HostRoot 指向 FiberRootNode */
  stateNode: any;

  // ---- Fiber 树结构 ----
  /** 父 Fiber 节点（向上指针） */
  return: FiberNode | null = null;
  /** 第一个子 Fiber 节点（向下指针） */
  child: FiberNode | null = null;
  /** 下一个兄弟 Fiber 节点（同级指针） */
  sibling: FiberNode | null = null;
  /** 当前节点在兄弟节点中的索引位置，用于多子节点 diff */
  index: number = 0;

  /** 对宿主组件实例的引用，对应 JSX 中的 ref 属性 */
  ref: Ref = null;
  /** 本次更新待处理的 props（新 props，尚未生效） */
  pendingProps: Props;
  /** 上一次渲染已生效的 props（beginWork 结束后 pendingProps 会被记录到此处） */
  memoizedProps: Props | null = null;
  /** 上一次渲染已生效的 state（HostRoot 中存储的是 ReactElement 子树，FunctionComponent 中是 hooks 链表头） */
  memoizedState: any = null;
  /** effect 环形链表，useEffect/useLayoutEffect 产生的 effect 挂载在此 */
  updateQueue: any = null;

  // ---- 双缓冲 ----
  /** 指向另一棵树中对应的 Fiber 节点：current.alternate = wip，wip.alternate = current */
  alternate: FiberNode | null = null;

  // ---- 副作用 ----
  /** 当前节点自身的副作用标记，如 Placement（插入）、Update（更新）、Deletion（删除） */
  flags: Flags = NoFlags;
  /** 子树中所有副作用标记的聚合，在 completeWork 中自底向上冒泡收集 */
  subtreeFlags: Flags = NoFlags;

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    this.tag = tag;
    this.key = key;
    this.type = null;
    this.stateNode = null;
    this.pendingProps = pendingProps;
  }
}

export class FiberRootNode {
  /** 宿主环境的根容器，浏览器中为挂载的 DOM 节点（如 document.getElementById('root')） */
  container: any;
  /** 指向当前屏幕上显示内容对应的 HostRoot Fiber 节点（current 树的根） */
  current: FiberNode;
  /** 渲染阶段完成后待提交的 wip 树根节点，commitRoot 消费后置空 */
  finishedWork: FiberNode | null = null;

  constructor(container: any, hostRootFiber: FiberNode) {
    this.container = container;
    this.current = hostRootFiber;
    hostRootFiber.stateNode = this;
  }
}
