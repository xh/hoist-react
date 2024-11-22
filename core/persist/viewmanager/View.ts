import {PlainObject} from '@xh/hoist/core';
import {ViewInfo} from '@xh/hoist/core/persist/viewmanager/index';
import {isEqual} from 'lodash';

/**
 * Wrapper for a ViewInfo object accompanied by its state.
 */
export class View<T = PlainObject> {
    /** Null for 'default' view */
    info: ViewInfo;
    /** State for the view. Only state that differs from the initial "code" state is captured. */
    value: Partial<T>;

    static DEFAULT = new View<{}>(null, {});

    get isDefault(): boolean {
        return !this.info;
    }

    get isGlobal(): boolean {
        return this.info?.isGlobal ?? false;
    }

    get lastUpdated(): number {
        return this.info?.lastUpdated ?? null;
    }

    get token(): string {
        return this.info?.token ?? null;
    }

    constructor(info: ViewInfo, value: Partial<T>) {
        this.info = info;
        this.value = value;
    }

    isValueEqual(other: View<T>): boolean {
        return isEqual(this.value, other.value);
    }

    isSameVersion(other: View<T>): boolean {
        return this.lastUpdated === other.lastUpdated;
    }
}
