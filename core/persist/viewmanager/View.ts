import {PlainObject} from '@xh/hoist/core';
import {ViewManagerModel} from './ViewManagerModel';
import {ViewInfo} from './ViewInfo';
import {JsonBlob} from '@xh/hoist/svc';

/**
 * A named saved bundle of state for components.
 */
export class View<T extends PlainObject = PlainObject> {
    /**
     * Default View representing code state of all contained components.
     * Available for all view managers where `enableDefault` is true.
     */

    /** Metadata about this View. Null for 'default' view */
    readonly info: ViewInfo;

    /**
     * State for the components in the view. Only state that differs from the initial "code"
     * state of the components is captured.
     */
    readonly value: Partial<T> = null;

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

    static fromBlob<T>(blob: JsonBlob, model: ViewManagerModel): View<T> {
        return new View(new ViewInfo(blob, model), blob.value);
    }

    static createDefault<T>(): View<T> {
        return new View(null, {});
    }

    withUpdatedValue(value: Partial<T>): View<T> {
        return new View(this.info, value);
    }

    constructor(info: ViewInfo, value: Partial<T>) {
        this.info = info;
        this.value = value;
    }
}
