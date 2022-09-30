import {HoistService, HoistModel} from './';
import {observable, action, makeObservable} from '@xh/hoist/mobx';

/**
 * Generic singleton object for cataloging global models and services.
 *
 * Not intended for application use.
 */
export class InstanceManager {

    @observable.shallow
    services: Set<HoistService> = new Set();

    @observable.shallow
    models: Set<HoistModel> = new Set();

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

    constructor() {
        makeObservable(this);
    }
}
export const instanceManager = new InstanceManager();
