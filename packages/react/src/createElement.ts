import { REACT_ELEMENT_TYPE } from '@p-react/shared';
import type { Type, Key, Ref, Props, ReactElement } from '@p-react/shared';

export function createElement(
  type: Type,
  config: Record<string, any> | null,
  ...maybeChildren: any[]
): ReactElement {
  const props: Props = {};
  let key: Key = null;
  let ref: Ref = null;

  if (config) {
    for (const prop in config) {
      if (prop === 'key') {
        key = '' + config[prop];
      } else if (prop === 'ref') {
        ref = config[prop];
      } else {
        props[prop] = config[prop];
      }
    }
  }

  if (maybeChildren.length === 1) {
    props.children = maybeChildren[0];
  } else if (maybeChildren.length > 1) {
    props.children = maybeChildren;
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };
}
