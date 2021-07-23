/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {isString} from 'lodash';
import {ToastModel} from './ToastModel';

/**
 *  Supports displaying a pop-up Toast.
 *  @private
 */
export class ToastSourceModel extends HoistModel {

    @managed
    @observable.ref
    toastModels = [];

    constructor() {
        super();
        makeObservable(this);
    }

    show(config) {
        if (isString(config)) config = {message: config};
        const ret = new ToastModel(config);
        this.addModel(ret);
        return ret;
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model) {
        this.toastModels.push(model);
        this.cull();
    }

    @action
    cull() {
        const models = this.toastModels,
            keepModels = models.filter(it => it.isOpen),
            cullModels = models.filter(it => !it.isOpen);

        this.toastModels = keepModels;
        cullModels.forEach(it => it.destroy());
    }
}
