/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {observable, action} from '@xh/hoist/mobx';
import {HoistModel, managed} from '@xh/hoist/core';
import {ToastModel} from './ToastModel';

/**
 *  Supports displaying pop-up Toast.
 *
 *  @private
 */
@HoistModel
export class ToastSourceModel {

    @managed
    @observable.ref
    toastModels = [];

    show(config) {
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