/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isString, partition} from 'lodash';
import {ToastModel} from './ToastModel';

/**
 *  Supports displaying a pop-up Toast.
 *  @private
 */
export class ToastSourceModel extends HoistModel {

    /** @member {ToastModel[]} */
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

        // Cull and install new reference.
        const [keep, cull] = partition(this.toastModels, 'isOpen');
        this.toastModels = keep;
        XH.safeDestroy(cull);
    }
}
