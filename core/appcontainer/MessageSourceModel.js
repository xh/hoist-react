/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isUndefined} from 'lodash';
import {MessageModel} from './MessageModel';

/**
 * Supports managed display of modal message dialogs via `XH.message()` and friends.
 * Not intended for direct application use. {@see XHClass#message()} and related for the public API.
 * @private
 */
@HoistModel
export class MessageSourceModel {

    @managed
    @observable.ref
    msgModels = [];

    message(config) {

        // Default autoFocus on any confirm button, if no input control and developer has made no explicit request
        const {confirmProps, cancelProps, input} = config;

        if ((confirmProps && isUndefined(confirmProps.autoFocus)) &&
            (!cancelProps || isUndefined(cancelProps.autoFocus)) &&
            !input
        ) {
            confirmProps.autoFocus = true;
        }

        const ret = new MessageModel(config);
        this.addModel(ret);
        return ret.result;
    }

    alert(config) {
        return this.message({
            ...config,
            confirmProps: {text: 'OK', ...config.confirmProps}
        });
    }

    confirm(config) {
        return this.message({
            ...config,
            confirmProps: {text: 'OK', ...config.confirmProps},
            cancelProps: {text: 'Cancel', ...config.cancelProps}
        });
    }

    prompt(config) {
        return this.message({
            ...config,
            confirmProps: {text: 'OK', ...config.confirmProps},
            cancelProps: {text: 'Cancel', ...config.cancelProps},
            input: config.input || {}
        });
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model) {
        this.msgModels.push(model);
        this.cull();
    }

    @action
    cull() {
        const models = this.msgModels,
            keepModels = models.filter(it => it.isOpen),
            cullModels = models.filter(it => !it.isOpen);

        this.msgModels = keepModels;
        cullModels.forEach(it => it.destroy());
    }

}