/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEqual} from 'lodash';

/**
 * Interface for objects that can be bound to a {@link PersistenceProvider}.
 * @typeParam S - must be serializable to JSON and PersistableState<S> must be observable
 */
export interface Persistable<S> {
    getPersistableState(): PersistableState<S>;
    setPersistableState(state: PersistableState<S>): void;
}

/** Wrapper for a serializable Persistable state object. */
export class PersistableState<S> {
    value: S;

    constructor(value: S) {
        this.value = value;
    }

    equals(other: PersistableState<S>): boolean {
        return isEqual(this.value, other.value);
    }
}
