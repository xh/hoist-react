import {HoistService, HoistModel} from './';
import {HoistStore} from '@xh/hoist/data';
import {observable, action, makeObservable} from '@xh/hoist/mobx';

/**
 * Generic singleton object for cataloging global models and services.
 *
 * Not intended for application use.
 * @package
 */
export class InstanceManager {

    @observable.shallow
    services: Set<HoistService> = new Set();

    @observable.shallow
    models: Set<HoistModel> = new Set();


    @observable.shallow
    stores: Set<HoistModel> = new Set();

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
    registerStore(s: HoistStore) {
        this.stores.add(s);
    }

    @action
    unregisterStore(s: HoistStore) {
        this.stores.delete(s);
    }

    constructor() {
        makeObservable(this);
    }
}
export const instanceManager = new InstanceManager();
