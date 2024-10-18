import {PlainObject} from '@xh/hoist/core';

/**
 * Interface for objects that can be bound to a PersistenceProvider.
 * @typeParam S - must be observable and serializable to JSON.
 */
export interface Persistable<S extends PlainObject> {
    getPersistableState(): S;
    setPersistableState(state: S): void;
}
