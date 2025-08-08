/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, MessageSpec, MessageSpecInput, XH} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {filter, isUndefined, partition} from 'lodash';
import {MessageModel} from './MessageModel';

/**
 * Supports managed display of modal message dialogs via `XH.message()` and friends.
 * Not intended for direct application use - use helpers off of `XH` instead.
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

    alert(config: MessageSpec) {
        return this.message({
            ...config,
            confirmProps: {text: 'OK', ...config.confirmProps}
        });
    }

    confirm(config: MessageSpec) {
        return this.message({
            title: 'Please confirm...',
            icon: Icon.warning(),
            ...config,
            confirmProps: {text: 'OK', ...config.confirmProps},
            cancelProps: {text: 'Cancel', ...config.cancelProps}
        });
    }

    prompt(config: MessageSpec) {
        return this.message({
            ...config,
            confirmProps: {text: 'OK', ...config.confirmProps},
            cancelProps: {text: 'Cancel', ...config.cancelProps},
            input: config.input ?? {}
        });
    }

    //------------------
    // Implementation
    //------------------
    @action
    private addModel(model: MessageModel) {
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

export function confirmInputTypeToConfirm(target: string): MessageSpecInput {
    return {
        item: formField({
            field: '',
            label: `Type '${target}' to confirm:`,
            inline: true,
            item: textInput()
        }),
        rules: [({value}) => (value === target ? null : `You must type '${target}' to confirm.`)]
    };
}
