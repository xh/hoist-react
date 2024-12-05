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

    private readonly model: ViewManagerModel;

    get name(): string {
        return this.info?.name ?? 'Default';
    }

    get token(): string {
        return this.info?.token ?? null;
    }

    get type(): string {
        return this.model.type;
    }

    get isDefault(): boolean {
        return !this.info;
    }

    get isGlobal(): boolean {
        return this.info?.isGlobal ?? false;
    }

    get lastUpdated(): number {
        return this.info?.lastUpdated ?? null;
    }

    get typedName(): string {
        return `${this.model.typeDisplayName} '${this.name}'`;
    }

    static fromBlob<T>(blob: JsonBlob, model: ViewManagerModel): View<T> {
        return new View(new ViewInfo(blob, model), blob.value, model);
    }

    static createDefault<T>(model: ViewManagerModel): View<T> {
        return new View(null, {}, model);
    }

    withUpdatedValue(value: Partial<T>): View<T> {
        return new View(this.info, value, this.model);
    }

    constructor(info: ViewInfo, value: Partial<T>, model: ViewManagerModel) {
        this.info = info;
        this.value = value;
        this.model = model;
    }
}
