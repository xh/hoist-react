/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {warnIf} from '@xh/hoist/utils/js';

/**
 * Model for a single instance of a modal dialog.
 * Not intended for direct application use. {@see XHClass#message()} and related for the public API.
 * @private
 */
export class MessageModel extends HoistModel {

    // Immutable properties
    title;
    icon;
    message;
    input;
    confirmProps;
    cancelProps;
    cancelAlign;
    onConfirm;
    onCancel;
    messageKey;

    // Promise to be resolved when user has clicked on choice and its internal resolver
    result;
    _resolver;

    @observable isOpen = true;

    constructor({
        title,
        icon,
        message,
        messageKey,
        input,
        confirmProps = {},
        cancelProps = {},
        cancelAlign = 'right',
        onConfirm,
        onCancel,

        // Deprecated
        confirmText,
        confirmIntent,
        cancelText,
        cancelIntent
    }) {
        super();
        makeObservable(this);
        warnIf(
            (confirmText || confirmIntent || cancelText || cancelIntent),
            'Message "confirmText", "confirmIntent", "cancelText", and "cancelIntent" configs have' +
            ' been deprecated - use "confirmProps" and "cancelProps" instead.'
        );

        this.title = title;
        this.icon = icon;
        this.message = message;
        this.messageKey = messageKey;

        if (input) {
            this.input = input;
            const {initialValue, rules} = input;
            this.formModel = this.markManaged(
                new FormModel({fields: [{name: 'value', initialValue, rules}]})
            );
        }

        this.confirmProps = this.parseButtonProps(confirmProps, () => this.doConfirmAsync(), confirmText, confirmIntent);
        this.cancelProps = this.parseButtonProps(cancelProps, () => this.doCancel(), cancelText, cancelIntent);
        this.cancelAlign = cancelAlign;

        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.result = new Promise(resolve => this._resolver = resolve);

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
        super.destroy();
    }

    // Merge handler and deprecated props into consolidated object.
    // Return null if neither text nor icon provided - button should not be displayed.
    parseButtonProps(props, handler, deprText, deprIntent) {
        warnIf(props.onClick, 'Cannot specify "onClick" callback for default Message buttons - callback will be ignored.');

        const ret = {...props, onClick: handler};
        if (deprText) ret.text = deprText;
        if (deprIntent) ret.intent = deprIntent;
        return (ret.text || ret.icon) ? ret : null;
    }
}

/**
 * @typedef {Object} MessageInput
 * @property {Element} [item] - the React element to render; should be a HoistInput, defaults to a
 *      platform appropriate TextInput.
 * @property {Rule[]} [rules] - validation constraints to apply.
 * @property {*} [initialValue] - initial value for the input.
 */
