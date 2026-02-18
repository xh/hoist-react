/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import './DialogPanel.scss';
import {panel, PanelProps} from './Panel';

export interface DialogPanelProps extends PanelProps {
    /** Is the dialog panel shown.  */
    isOpen?: boolean;
}

/**
 * Wraps a Panel in a fullscreen floating Dialog.
 *
 * These views do not participate in navigation or routing, and are used for showing fullscreen
 * views outside of the Navigator / TabContainer context.
 *
 * @see FullscreenPanel for a true fullscreen, non-floating alternative.
 */
export const [DialogPanel, dialogPanel] = hoistCmp.withFactory<DialogPanelProps>({
    displayName: 'DialogPanel',
    className: 'xh-dialog xh-dialog-panel',
    memo: false,
    model: false,
    observer: false,

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
