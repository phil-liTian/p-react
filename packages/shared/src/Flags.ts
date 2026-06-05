// 副作用标记 - 对应源码 ReactFiberFlags.js
// 使用位运算，方便组合判断
export const NoFlags = 0b0000000;
export const Placement = 0b0000001; // 新增插入
export const Update = 0b0000010; // 更新
export const ChildDeletion = 0b0000100; // 子节点删除
export const PassiveEffect = 0b0001000; // 存在 useEffect 回调待执行
export const LayoutEffect = 0b0010000; // 存在 useLayoutEffect 回调待执行
export const InsertionEffect = 0b0100000; // 存在 useInsertionEffect 回调待执行

export type Flags = number;
