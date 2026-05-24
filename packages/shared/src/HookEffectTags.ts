// Effect 类型标记 - 对应源码 ReactHookEffectTags.js
// 用于区分 effect 是否需要执行（HookHasEffect）及其类型（Passive / Layout）

/** 标记当前 effect 需要被执行（deps 变化时设置） */
export const HookHasEffect = 0b0001;
/** useEffect 对应的 passive effect（异步执行，paint 后） */
export const HookPassive = 0b1000;
