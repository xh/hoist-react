/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {HoistService, HoistModel} from './..';
import {Store} from '@xh/hoist/data';
import {observable, action, makeObservable} from '@xh/hoist/mobx';

/**
 * Generic singleton object for cataloging global models and services.
 *
 * Not intended for application use.
 * @package
 */
class InstanceManager {

    @observable.shallow
    services: Set<HoistService> = new Set();

    @observable.shallow
    models: Set<HoistModel> = new Set();


    @observable.shallow
    stores: Set<Store> = new Set();

    @action
    registerModel(m: HoistModel) {
        this.models.add(m);
    }

    @action
    unregisterModel(m: HoistModel) {
        this.models.delete(m);
    }

    @action
    registerService(s: HoistService) {
        this.services.add(s);
    }

    @action
    registerStore(s: Store) {
        this.stores.add(s);
    }

    @action
    unregisterStore(s: Store) {
        this.stores.delete(s);
    }

    constructor() {
        makeObservable(this);
    }
}
export const instanceManager = new InstanceManager();
