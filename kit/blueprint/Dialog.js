/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

/**
 * Dialog Body for Blueprint, wrapped as a Hoist Component.
 */
export const [DialogBody, dialogBody] = hoistCmp.withFactory({
    displayName: 'DialogBody',
    className: 'bp3-dialog-body',
    observer: false, model: false, memo: false,

    render(props) {
        return div(props);
    }
});

/**
 * Dialog Footer for Blueprint, wrapped as Hoist Component.
 */
export const [DialogFooter, dialogFooter] = hoistCmp.withFactory({
    displayName: 'DialogFooter',
    className: 'bp3-dialog-footer',
    observer: false, model: false, memo: false,

    render(props) {
        return div(props);
    }
});

/**
 * Dialog Footer Actions for Blueprint, wrapped as HoistComponent.
 */
export const [DialogFooterActions, dialogFooterActions] = hoistCmp.withFactory({
    displayName: 'DialogFooterActions',
    className: 'bp3-dialog-footer-actions',
    observer: false, model: false, memo: false,

    render(props) {
        return div(props);
    }
});