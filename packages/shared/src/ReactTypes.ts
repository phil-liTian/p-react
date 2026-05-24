// React Element 类型定义
export type Type = string | Function;
export type Key = string | null;
export type Ref = any;
export type Props = Record<string, any> & { children?: ReactElement[] };

export interface ReactElement {
  $$typeof: symbol;
  type: Type;
  key: Key;
  ref: Ref;
  props: Props;
}
