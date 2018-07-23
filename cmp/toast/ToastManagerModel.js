/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {ToastModel} from './ToastModel';

/**
 *  Support for showing global Toasts in an application.
 *  This class supports the public XH.toast() method.
 *  @private
 */
@HoistModel()
export class ToastManagerModel {

    @observable.ref toastModels = [];

    show(config) {
        const ret = new ToastModel({manager: this, ...config});
        this.addModel(ret);
        return ret;
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model) {
        this.toastModels.push(model);
        this.cullToasts();
    }

    @action
    cullToasts() {
        const models = this.toastModels,
            keepModels = models.filter(it => !it.isDismissed),
            cullModels = models.filter(it => it.isDismissed);

        this.toastModels = keepModels;
        cullModels.forEach(it => it.destroy());
    }

}