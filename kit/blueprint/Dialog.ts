/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {elementFactory, hoistCmp} from '@xh/hoist/core';
import {Dialog as BpDialog} from '@blueprintjs/core';

const bpDialog = elementFactory(BpDialog)


/**
 * Dialog Body for Blueprint, wrapped as a Hoist Component.
 */
export const [Dialog, dialog] = hoistCmp.withContainerFactory({
    displayName: 'Dialog',
    observer: false, model: false, memo: false,

    render(props) {
        return bpDialog({
            portalContainer: document.getElementById('xh-app-content'),
            ...props
        });
    }
});

export const [DialogBody, dialogBody] = hoistCmp.withContainerFactory({
    displayName: 'DialogBody',
    className: 'bp4-dialog-body',
    observer: false, model: false, memo: false,

    render(props) {
        return div(props);
    }
});

/**
 * Dialog Footer for Blueprint, wrapped as Hoist Component.
 */
export const [DialogFooter, dialogFooter] = hoistCmp.withContainerFactory({
    displayName: 'DialogFooter',
    className: 'bp4-dialog-footer',
    observer: false, model: false, memo: false,

    render(props) {
        return div(props);
    }
});

/**
 * Dialog Footer Actions for Blueprint, wrapped as HoistComponent.
 */
export const [DialogFooterActions, dialogFooterActions] = hoistCmp.withContainerFactory({
    displayName: 'DialogFooterActions',
    className: 'bp4-dialog-footer-actions',
    observer: false, model: false, memo: false,

    render(props) {
        return div(props);
    }
});
