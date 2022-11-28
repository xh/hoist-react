/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

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

    constructor() {
        makeObservable(this);
    }
}
export const instanceManager = new InstanceManager();
