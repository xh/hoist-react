/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
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
    messageKey;
    className;
    input;
    confirmProps;
    cancelProps;
    cancelAlign;
    onConfirm;
    onCancel;
    cancelOnClose;

    // Promise to be resolved when user has clicked on choice and its internal resolver
    result;
    _resolver;

    @observable isOpen = true;

    constructor({
        title,
        icon,
        message,
        messageKey,
        className,
        input,
        confirmProps = {},
        cancelProps = {},
        cancelAlign = 'right',
        onConfirm,
        onCancel,
        cancelOnClose = true
    }) {
        super();
        makeObservable(this);

        this.title = title;
        this.icon = icon;
        this.message = message;
        this.messageKey = messageKey;
        this.className = className;
        this.cancelOnClose = cancelOnClose;

        if (input) {
            this.input = input;
            const {initialValue, rules} = input;
            this.formModel = this.markManaged(
                new FormModel({fields: [{name: 'value', initialValue, rules}]})
            );
        }

        this.confirmProps = this.parseButtonProps(confirmProps, () => this.doConfirmAsync());
        this.cancelProps = this.parseButtonProps(cancelProps, () => this.doCancel());
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
    parseButtonProps(props, handler) {
        warnIf(props.onClick, 'Cannot specify "onClick" callback for default Message buttons - callback will be ignored.');

        const ret = {...props, onClick: handler};
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
