// Fiber 节点类型标记 - 对应源码 ReactWorkTags.js
export const FunctionComponent = 0;
export const HostRoot = 3; // ReactDOM.createRoot 的根节点
export const HostComponent = 5; // div, span 等原生标签
export const HostText = 6; // 文本节点

export type WorkTag =
  | typeof FunctionComponent
  | typeof HostRoot
  | typeof HostComponent
  | typeof HostText;
