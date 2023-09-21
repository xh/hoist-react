/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {HoistService, HoistModel} from './..';
import {Store} from '@xh/hoist/data';
import {observable, makeObservable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';

/**
 * Generic singleton object for cataloging global models and services.
 * @internal
 */
class InstanceManager {
    @observable.shallow
    services: Set<HoistService> = new Set();

    @observable.shallow
    models: Set<HoistModel> = new Set();

    @observable.shallow
    stores: Set<Store> = new Set();

    private modelsByTestId: Map<string, HoistModel> = new Map();

    registerModel(m: HoistModel) {
        wait().thenAction(() => this.models.add(m));
    }

    unregisterModel(m: HoistModel) {
        wait().thenAction(() => this.models.delete(m));
    }

    registerService(s: HoistService) {
        wait().thenAction(() => this.services.add(s));
    }

    registerStore(s: Store) {
        wait().thenAction(() => this.stores.add(s));
    }

    unregisterStore(s: Store) {
        wait().thenAction(() => this.stores.delete(s));
    }

    registerModelWithTestId(testId: string, m: HoistModel) {
        this.modelsByTestId.set(testId, m);
    }

    unregisterModelWithTestId(testId: string) {
        this.modelsByTestId.delete(testId);
    }

    getModelByTestId(testId: string): HoistModel {
        const model = this.modelsByTestId.get(testId);
        throwIf(!model, `No model found for component with testId: ${testId}`);
        return model;
    }

    constructor() {
        makeObservable(this);
    }
}
export const instanceManager = new InstanceManager();
