/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {Position} from '@xh/hoist/kit/blueprint';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {SECONDS} from '@xh/hoist/utils/datetime';

/**
 * Model for a single instance of a pop-up Toast alert.
 *
 * An instance of this class is returned by the primary `XH.toast()` API and its variants.
 * It is primarily useful for its `dismiss()` method, which can be called to programmatically
 * dismiss a Toast at any time.
 *
 * All other properties on this object should be considered immutable - attempting to change them
 * will have no effect.
 */
export class ToastModel extends HoistModel {
    xhImpl = true;

    /** @member {string} */
    message;
    /** @member {ReactElement} */
    icon;
    /** @member {number} */
    timeout;
    /** @member {string} */
    intent;
    /** @member {object} */
    actionButtonProps;
    /** @member {string} */
    position;
    /** @member {HTMLElement} */
    containerRef;

    @observable isOpen = true;

    constructor({
        message,
        icon,
        timeout = 3 * SECONDS,
        intent = 'primary',
        actionButtonProps,
        position = Position.BOTTOM_RIGHT,
        containerRef = null
    }) {
        super();
        makeObservable(this);
        this.message = message;
        this.icon = icon;
        this.timeout = timeout;
        this.intent = intent;
        this.actionButtonProps = actionButtonProps;
        this.position = position;
        this.containerRef = containerRef;
    }

    /** Hide this Toast immediately, if displayed. */
    @action
    dismiss() {
        this.isOpen = false;
    }

    destroy() {
        this.dismiss();
        super.destroy();
    }
}
