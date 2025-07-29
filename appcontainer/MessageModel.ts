/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, XH, MessageSpec, managed, MessageSuppressOpts} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {DAYS, HOURS, MINUTES} from '@xh/hoist/utils/datetime';
import {pluralize, throwIf, warnIf} from '@xh/hoist/utils/js';
import {isEmpty, isNil, isUndefined} from 'lodash';
import {ReactElement, ReactNode} from 'react';

/**
 * Model for a single instance of a modal dialog.
 * Not intended for direct application use.
 * @see XHClass.message()
 * @internal
 */
export class MessageModel extends HoistModel {
    override xhImpl = true;

    //---------------------------------------
    // Immutable properties from application
    //----------------------------------------
    title: string;
    icon: ReactElement;
    message: ReactNode;
    messageKey: string;
    className: string;
    input: MessageSpec['input'];
    suppressOpts: MessageSuppressOpts;
    confirmProps: any;
    cancelProps: any;
    cancelAlign: any;
    onConfirm: () => void;
    onCancel: () => void;
    dismissable: boolean;
    cancelOnDismiss: boolean;

    @observable
    isOpen = false;

    @managed
    formModel: FormModel;

    private resolver: (val: unknown) => void;

    constructor({
        title,
        icon,
        message,
        messageKey,
        className,
        input,
        suppressOpts = null,
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

        throwIf(
            suppressOpts && !messageKey,
            'Must specify "messageKey" if "suppressOpts" specified.'
        );

        this.title = title;
        this.icon = icon;
        this.message = message;
        this.messageKey = messageKey;
        this.className = className;
        this.dismissable = dismissable;
        this.cancelOnDismiss = cancelOnDismiss;
        this.suppressOpts = suppressOpts;
        this.input = input;
        this.formModel = this.createFormModel();

        // create buttons
        if (confirmProps && isUndefined(cancelProps?.autoFocus) && !input) {
            confirmProps = {autoFocus: true, ...confirmProps};
        }
        this.confirmProps = this.parseButtonProps(confirmProps, () => this.doConfirmAsync());
        this.cancelProps = this.parseButtonProps(cancelProps, () => this.doCancel());

        this.cancelAlign = cancelAlign;
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
    }

    //--------------------------
    // For MessageSourceModel
    //--------------------------
    @action
    async triggerMessageAsync() {
        if (this.suppressOpts) {
            const ret = XH.localStorageService.get(this.suppressKey);
            if (ret && (!ret.expiry || Date.now() <= ret.expiry)) {
                this.logDebug('Suppressing message with previous response', this.messageKey, ret);
                return Promise.resolve(ret.value);
            }
        }
        this.isOpen = true;
        return new Promise(resolve => (this.resolver = resolve));
    }

    //------------------------
    // For component handlers
    //-----------------------
    @action
    async doConfirmAsync() {
        let {formModel} = this,
            value = true;

        if (formModel) {
            await formModel.validateAsync();
            if (!formModel.isValid) return;
            value = formModel.values.value;
            if (formModel.values.suppress) {
                let {suppressExpiry} = this;
                if (suppressExpiry) suppressExpiry += Date.now();
                XH.localStorageService.set(this.suppressKey, {expiry: suppressExpiry, value});
            }
        }

        this.onConfirm?.();
        this.resolver(value);
        this.close();
    }

    @action
    doCancel() {
        this.onCancel?.();
        this.resolver(false);
        this.close();
    }

    @action
    doEscape() {
        if (!this.dismissable) return;
        if (this.cancelOnDismiss) {
            this.doCancel();
            return;
        }
        this.resolver(null);
        this.close();
    }

    @action
    close() {
        this.isOpen = false;
    }

    get suppressExpiry(): number {
        if (!this.suppressOpts) return null;
        const {expiry, expiryUnits} = this.suppressOpts;

        if (isNil(expiry)) return null;
        switch (expiryUnits ?? 'days') {
            case 'minutes':
                return expiry * MINUTES;
            case 'hours':
                return expiry * HOURS;
            case 'days':
                return expiry * DAYS;
        }
        return null;
    }

    get suppressExpiryLabel(): string {
        if (!this.suppressOpts) return null;
        const {expiry, expiryUnits} = this.suppressOpts;
        if (isNil(expiry)) return null;
        switch (expiryUnits ?? 'days') {
            case 'minutes':
                return pluralize('minute', expiry, true);
            case 'hours':
                return pluralize('hour', expiry, true);
            case 'days':
                return pluralize('day', expiry, true);
        }
        return null;
    }

    //-----------------------
    // Implementation
    //-----------------------
    override destroy() {
        this.close();
        super.destroy();
    }

    private createFormModel(): FormModel {
        const {input, suppressOpts} = this,
            fields = [];
        if (input) {
            fields.push({name: 'value', initialValue: input.initialValue, rules: input.rules});
        }
        if (suppressOpts) {
            fields.push({name: 'suppress', initialValue: suppressOpts.defaultValue});
        }
        return isEmpty(fields) ? null : new FormModel({fields});
    }

    private parseButtonProps(props, handler) {
        warnIf(
            props.onClick,
            'Cannot specify "onClick" callback for default Message buttons - callback will be ignored.'
        );
        const ret = {...props, onClick: handler};
        return ret.text || ret.icon ? ret : null;
    }

    private get suppressKey(): string {
        return `xhMessageResults.${this.messageKey}`;
    }
}
