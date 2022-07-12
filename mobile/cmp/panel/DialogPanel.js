/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import PT from 'prop-types';
import './DialogPanel.scss';
import {panel, Panel} from './Panel';

/**
 * Wraps a Panel in a fullscreen Dialog.
 *
 * These views do not participate in navigation or routing, and are used for showing fullscreen
 * views outside of the Navigator / TabContainer context.
 */
export const [DialogPanel, dialogPanel] = hoistCmp.withFactory({
    displayName: 'DialogPanel',
    className: 'xh-dialog xh-dialog-panel',
    memo: false, model: false, observer: false,

    render({className, isOpen, children, ...rest}) {

        if (!isOpen) return null;

        return dialog({
            isOpen: true,
            isCancelable: false,
            className,
            items: panel({
                items: children,
                ...rest
            })
        });
    }
});
DialogPanel.propTypes = {
    ...Panel.propTypes,

    /** Is the dialog panel shown.  */
    isOpen: PT.bool
};
