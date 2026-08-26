/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistService, HoistModel} from '../';
import {isNil} from 'lodash';
import type {Cube, Store, View} from '@xh/hoist/data';
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

    @observable.shallow
    cubes: Set<Cube> = new Set();

    @observable.shallow
    views: Set<View> = new Set();

    private modelsByTestId: Map<string, HoistModel> = new Map();
    private testSupportedModels = new Set(['GridModel', 'DataViewModel', 'FormModel', 'TabModel']);

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

    registerCube(c: Cube) {
        wait().thenAction(() => this.cubes.add(c));
    }

    unregisterCube(c: Cube) {
        wait().thenAction(() => this.cubes.delete(c));
    }

    registerView(v: View) {
        wait().thenAction(() => this.views.add(v));
    }

    unregisterView(v: View) {
        wait().thenAction(() => this.views.delete(v));
    }

    registerModelWithTestId(testId: string, m: HoistModel) {
        if (
            isNil(testId) ||
            isNil(m) ||
            !m.isHoistModel ||
            !this.testSupportedModels.has(m.constructor.name) ||
            this.modelsByTestId.has(testId)
        )
            return;
        this.modelsByTestId.set(testId, m);
    }

    unregisterModelWithTestId(testId: string) {
        this.modelsByTestId.delete(testId);
    }

    getModelByTestId(testId: string): HoistModel {
        return this.modelsByTestId.get(testId);
    }

    constructor() {
        makeObservable(this);
    }
}
export const instanceManager = new InstanceManager();
