/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';

/** Padded content area of a dialog, between its header and footer. */
export const [DialogBody, dialogBody] = hoistCmp.withFactory({
    displayName: 'DialogBody',
    className: 'xh-dialog__body',
    observer: false,
    model: false,
    memo: false,

    render(props) {
        return div(props);
    }
});

/** Footer of a dialog, below its body. */
export const [DialogFooter, dialogFooter] = hoistCmp.withFactory({
    displayName: 'DialogFooter',
    className: 'xh-dialog__footer',
    observer: false,
    model: false,
    memo: false,

    render(props) {
        return div(props);
    }
});

/** Right-aligned row of buttons within a dialog footer. */
export const [DialogFooterActions, dialogFooterActions] = hoistCmp.withFactory({
    displayName: 'DialogFooterActions',
    className: 'xh-dialog__footer-actions',
    observer: false,
    model: false,
    memo: false,

    render(props) {
        return div(props);
    }
});
