import {isEqual} from 'lodash';

/**
 * Interface for objects that can be bound to a PersistenceProvider.
 * @typeParam S - must be serializable to JSON and PersistableState<S> must be observable
 */
export interface Persistable<S> {
    getPersistableState(): PersistableState<S>;
    setPersistableState(state: PersistableState<S>): void;
}

/**
 * Wraps a serializable Persistable state object.
 */
export class PersistableState<S> {
    value: S;

    constructor(value: S) {
        this.value = value;
    }

    equals(other: PersistableState<S>): boolean {
        return isEqual(this.value, other.value);
    }
}
