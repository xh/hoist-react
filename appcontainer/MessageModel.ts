/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, XH, MessageSpec, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {warnIf} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';

/**
 * Model for a single instance of a modal dialog.
 * Not intended for direct application use.
 * @see XHClass.message()
 * @internal
 */
export class MessageModel extends HoistModel {
    override xhImpl = true;

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
    dismissable;
    cancelOnDismiss;

    // Promise to be resolved when user has clicked on choice and its internal resolver
    result;
    _resolver;

    @managed
    formModel: FormModel;

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
        dismissable = !isEmpty(cancelProps),
        cancelOnDismiss = true
    }: MessageSpec) {
        super();
        makeObservable(this);

        this.title = title;
        this.icon = icon;
        this.message = message;
        this.messageKey = messageKey;
        this.className = className;
        this.dismissable = dismissable;
        this.cancelOnDismiss = cancelOnDismiss;

        if (input) {
            this.input = input;
            const {initialValue, rules} = input;
            this.formModel = new FormModel({fields: [{name: 'value', initialValue, rules}]});
        }

        this.confirmProps = this.parseButtonProps(confirmProps, () => this.doConfirmAsync());
        this.cancelProps = this.parseButtonProps(cancelProps, () => this.doCancel());
        this.cancelAlign = cancelAlign;

        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.result = new Promise(resolve => (this._resolver = resolve));

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

        this.onConfirm?.();
        this._resolver(resolvedVal);
        this.close();
    }

    @action
    doCancel() {
        this.onCancel?.();
        this._resolver(false);
        this.close();
    }

    @action
    doEscape() {
        if (!this.dismissable) return;
        if (this.cancelOnDismiss) {
            this.doCancel();
            return;
        }
        this._resolver(null);
        this.close();
    }

    @action
    close() {
        this.isOpen = false;
    }

    //-----------------------
    // Implementation
    //-----------------------
    override destroy() {
        this.close();
        super.destroy();
    }

    // Merge handler and deprecated props into consolidated object.
    // Return null if neither text nor icon provided - button should not be displayed.
    private parseButtonProps(props, handler) {
        warnIf(
            props.onClick,
            'Cannot specify "onClick" callback for default Message buttons - callback will be ignored.'
        );

        const ret = {...props, onClick: handler};
        return ret.text || ret.icon ? ret : null;
    }
}
