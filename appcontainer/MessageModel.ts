/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, XH, MessageSpec, MessageSuppressSpec, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {DAYS, HOURS, MINUTES} from '@xh/hoist/utils/datetime';
import {pluralize, throwIf, warnIf} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {ReactNode} from 'react';

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
    suppress: MessageSuppressSpec;
    extraConfirmLabel: ReactNode;
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

    /**
     * Previously saved response for a message the user has opted to suppress, or null if no
     * response saved, saved response expired, or suppression not enabled for this message.
     */
    static getSuppressedResult(spec: MessageSpec): {value: unknown} | null {
        const {messageKey} = spec,
            suppress = parseSuppress(spec.suppress);
        if (!suppress || !messageKey) return null;
        const saved = getSuppressStore(suppress).get(getSuppressKey(messageKey), null);
        return saved && (!saved.expiry || Date.now() <= saved.expiry) ? saved : null;
    }

    constructor({
        title,
        icon,
        message,
        messageKey,
        className,
        input,
        suppress,
        extraConfirmText,
        extraConfirmLabel,
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
            suppress && !messageKey,
            'Must specify a "messageKey" when "suppress" is enabled for a message.'
        );

        this.title = title;
        this.icon = icon;
        this.message = message;
        this.messageKey = messageKey;
        this.className = className;
        this.dismissable = dismissable;
        this.cancelOnDismiss = cancelOnDismiss;
        this.suppress = parseSuppress(suppress);

        const fields = [];

        if (input) {
            this.input = input;
            const {initialValue, rules} = input;
            fields.push({name: 'value', initialValue, rules});
        }

        if (extraConfirmText) {
            this.extraConfirmLabel = extraConfirmLabel ?? `Enter '${extraConfirmText}' to confirm:`;
            fields.push({
                name: 'extraConfirm',
                rules: [({value}) => (value === extraConfirmText ? null : `Confirmation required`)]
            });
        }

        if (this.suppress) {
            fields.push({name: 'suppress', initialValue: !!this.suppress.initialValue});
        }

        if (!isEmpty(fields)) {
            this.formModel = new FormModel({fields});
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

    /** Label for the suppress checkbox, as configured or an auto-generated default. */
    get suppressLabel(): ReactNode {
        const {suppress} = this;
        if (!suppress) return null;
        if (suppress.label) return suppress.label;
        const expiryLabel = this.suppressExpiryLabel;
        if (expiryLabel) return `Don't show this message again for ${expiryLabel}`;
        return suppress.storage === 'session'
            ? `Don't show this message again this session`
            : `Don't show this message again`;
    }

    @action
    async doConfirmAsync() {
        let resolvedVal = true;

        const {formModel} = this;
        if (formModel) {
            await formModel.validateAsync();
            if (!formModel.isValid) return;
            const data = formModel.getData();
            if (formModel.getField('value')) {
                resolvedVal = data.value;
            }
            if (data.suppress) {
                this.saveSuppressedResult(resolvedVal);
            }
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

    private saveSuppressedResult(value: unknown) {
        const {suppress} = this,
            {expiry} = suppress;
        getSuppressStore(suppress).set(getSuppressKey(this.messageKey), {
            value,
            expiry: expiry ? Date.now() + expiry : null
        });
    }

    // Humanized suppress expiry duration, expressed in the largest unit that divides it evenly.
    private get suppressExpiryLabel(): string {
        const {expiry} = this.suppress;
        if (!expiry) return null;
        const units: Array<[string, number]> = [
            ['day', DAYS],
            ['hour', HOURS],
            ['minute', MINUTES]
        ];
        for (const [unit, unitMs] of units) {
            if (expiry >= unitMs && expiry % unitMs === 0) {
                return pluralize(unit, expiry / unitMs, true);
            }
        }
        return pluralize('minute', Math.ceil(expiry / MINUTES), true);
    }
}

const parseSuppress = (suppress: boolean | MessageSuppressSpec): MessageSuppressSpec =>
    suppress ? (suppress === true ? {} : suppress) : null;

const getSuppressStore = (suppress: MessageSuppressSpec) =>
    suppress.storage === 'session' ? XH.sessionStorageService : XH.localStorageService;

const getSuppressKey = (messageKey: string) => `xhSuppressedMessage.${messageKey}`;
