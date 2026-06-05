/**
 * createContext: 创建 Context 对象
 * 对应源码: ReactContext.js → createContext
 *
 * 与源码的主要差异：省略了多渲染器支持（_currentValue2）和 DEV 字段
 */

import { REACT_CONTEXT_TYPE } from '@p-react/shared';

export interface ReactContext<T> {
  $$typeof: symbol;
  _currentValue: T;
  Provider: ReactContext<T>;
}

/**
 * 创建一个 Context 对象，Provider 属性就是 Context 本身（即 Context.Provider === Context）
 * 对应源码: ReactContext.js → createContext
 */
export function createContext<T>(defaultValue: T): ReactContext<T> {
  const context: ReactContext<T> = {
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    Provider: null as any,
  };

  // 源码中 Provider 直接指向 context 自身，beginWork 通过 $$typeof 识别
  context.Provider = context;

  return context;
}
