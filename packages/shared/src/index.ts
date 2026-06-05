export { type ReactElement, type Type, type Key, type Ref, type Props } from './ReactTypes';
export { FunctionComponent, HostRoot, HostComponent, HostText, ContextProvider, type WorkTag } from './WorkTags';
export { NoFlags, Placement, Update, ChildDeletion, PassiveEffect, LayoutEffect, InsertionEffect, type Flags } from './Flags';
export { HookHasEffect, HookPassive, HookLayout, HookInsertion } from './HookEffectTags';

export const REACT_ELEMENT_TYPE = Symbol.for('react.element');
export const REACT_CONTEXT_TYPE = Symbol.for('react.context');
