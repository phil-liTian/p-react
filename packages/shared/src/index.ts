export { type ReactElement, type Type, type Key, type Ref, type Props } from './ReactTypes';
export { FunctionComponent, HostRoot, HostComponent, HostText, type WorkTag } from './WorkTags';
export { NoFlags, Placement, Update, ChildDeletion, PassiveEffect, type Flags } from './Flags';
export { HookHasEffect, HookPassive } from './HookEffectTags';

export const REACT_ELEMENT_TYPE = Symbol.for('react.element');
