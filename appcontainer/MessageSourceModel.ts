/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH, MessageSpec} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {isUndefined, partition, filter} from 'lodash';
import {MessageModel} from './MessageModel';

/**
 * Supports managed display of modal message dialogs via `XH.message()` and friends.
 * Not intended for direct application use.
 * @see XHClass.message()
 * @internal
 */
export class MessageSourceModel extends HoistModel {
    override xhImpl = true;

    @managed
    @observable.ref
    msgModels: MessageModel[] = [];

    constructor() {
        super();
        makeObservable(this);
    }

    message(config: MessageSpec) {
        // Default autoFocus on any confirm button, if no input control and developer has made no explicit request
        const {confirmProps, cancelProps, input} = config;

        if (
            confirmProps &&
            isUndefined(confirmProps.autoFocus) &&
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
            input: config.input ?? {}
        });
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model) {
        const {messageKey} = model,
            {msgModels} = this;
        if (messageKey) {
            filter(msgModels, {messageKey}).forEach(m => m.close());
        }
        msgModels.push(model);
        const [keep, cull] = partition(msgModels, 'isOpen');
        this.msgModels = keep;
        XH.safeDestroy(cull);
    }
}
