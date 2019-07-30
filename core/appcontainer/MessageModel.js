/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {FormModel} from '@xh/hoist/cmp/form';

/**
 * Model for a single instance of a modal dialog.
 *
 * @private
 */
@HoistModel
export class MessageModel {

    // Immutable properties
    title = null;
    icon = null;
    message = null;
    input = null;
    confirmText = null;
    cancelText = null;
    confirmIntent = null;
    confirmAutoFocus = null;
    cancelIntent = null;
    onConfirm = null;
    onCancel = null;

    // Promise to be resolved when user has clicked on choice and its internal resolver
    result = null;
    _resolver = null;

    @observable isOpen = true;

    constructor(config) {
        this.title = config.title;
        this.icon = config.icon;
        this.message = config.message;
        this.input = config.input;
        this.confirmText = config.confirmText;
        this.cancelText = config.cancelText;
        this.confirmIntent = config.confirmIntent;
        this.confirmAutoFocus = config.confirmAutoFocus;
        this.cancelIntent = config.cancelIntent;
        this.onConfirm = config.onConfirm;
        this.onCancel = config.onCancel;
        this.result = new Promise(resolve => this._resolver = resolve);

        // Extract properties from input
        if (this.input) {
            const {value, rules} = this.input;

            this.formModel = this.markManaged(new FormModel({
                fields: [{
                    name: 'value',
                    initialValue: value,
                    rules: rules
                }]
            }));
        }

        // Message modals are automatically dismissed on app route changes to avoid navigating the
        // app underneath the dialog in an unsettling way.
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.close()
        });
    }

    @action
    async doConfirmAsync() {
        let resolvedVal = true;

        if (this.formModel) {
            await this.formModel.validateAsync();
            if (!this.formModel.isValid) return;
            resolvedVal = this.formModel.getData().value;
        }

        if (this.onConfirm) this.onConfirm();
        this._resolver(resolvedVal);
        this.close();
    }

    @action
    doCancel() {
        if (this.onCancel) this.onCancel();
        this._resolver(false);
        this.close();
    }

    //-----------------------
    // Implementation
    //-----------------------
    @action
    close() {
        this.isOpen = false;
    }

    destroy() {
        this.close();
    }
}

/**
 * @typedef {Object} MessageInput
 * @property {Element} [item] - the react element to render; should be a HoistInput, defaults to a
 *      platform appropriate TextInput.
 * @property {Rule[]} [rules] - validation constraints to apply.
 * @property {*} [initialValue] - initial value for the input.
 */