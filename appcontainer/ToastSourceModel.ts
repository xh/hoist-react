/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, ToastSpec, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isString, partition} from 'lodash';
import {ToastModel} from './ToastModel';

/**
 *  Supports displaying a pop-up Toast.
 *  @internal
 */
export class ToastSourceModel extends HoistModel {
    override xhImpl = true;

    @managed
    @observable.ref
    toastModels: ToastModel[] = [];

    constructor() {
        super();
        makeObservable(this);
    }

    show(config: ToastSpec | string) {
        if (isString(config)) config = {message: config};
        const ret = new ToastModel(config);
        this.addModel(ret);
        return ret;
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    private addModel(model) {
        this.toastModels.push(model);

        // Cull and install new reference.
        const [keep, cull] = partition(this.toastModels, 'isOpen');
        this.toastModels = keep;
        XH.safeDestroy(cull);
    }
}
