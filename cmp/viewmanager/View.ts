/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
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

    /**
     * Defaulted to value, but may be updated during ViewManagerModel's settleTime to be
     * the "settled" state after loading. Used for comparison to determine dirtiness.
     */
    settledValue: Partial<T> = null;

    private readonly model: ViewManagerModel;

    get name(): string {
        return this.info?.name ?? 'Default';
    }

    get group(): string {
        return this.info?.group;
    }

    get description(): string {
        return this.info?.description;
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

    get isShared(): boolean {
        return this.info?.isShared ?? false;
    }

    get isOwned(): boolean {
        return this.info?.isOwned ?? false;
    }

    get isCurrentView(): boolean {
        return this.token === this.model.view.token;
    }

    get lastUpdated(): number {
        return this.info?.lastUpdated ?? null;
    }

    get typedName(): string {
        return `${this.model.typeDisplayName} "${this.name}"`;
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
        this.settledValue = value;
        this.model = model;
    }
}
