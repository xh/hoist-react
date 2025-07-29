/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, MessageSpec, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {filter, partition} from 'lodash';
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

    init() {
        // Message modals are automatically dismissed on app route changes to avoid navigating the
        // app underneath the dialog in an unsettling way.
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.msgModels.forEach(m => m.close())
        });
    }

    /**
     * Display message to get input or confirmation from a user
     *
     * @returns Promise to be resolved with result.
     * Typically, resolves to a user result after the user has interacted with the form.
     * However, if `suppressOpts` have been specified, may immediately resolve
     * to the result of the user's previous response.
     */
    message(config: MessageSpec) {
        const model = new MessageModel(config),
            ret = model.triggerMessageAsync();
        this.addModel(model);
        return ret;
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
