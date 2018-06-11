/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {MessageModel} from '../MessageModel';

/**
 *  Support for hosting multiple global Messages in an application.
 *  This class supports the public XH.message(), XH.alert() and XH.confirm() methods.
 *  @private
 */
@HoistModel()
export class MessageSourceModel {

    @observable.ref msgModels = [];

    show(config) {
        const ret = new MessageModel(config);
        ret.show();
        this.addModel(ret);
        return ret;
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model) {
        // Add new model and simultaneously cull any models we are done with.
        const models = this.msgModels,
            keepModels = models.filter(it => it.isOpen),
            cullModels = models.filter(it => !it.isOpen);

        keepModels.push(model);
        
        this.msgModels = keepModels;
        cullModels.forEach(it => it.destroy());
    }
}