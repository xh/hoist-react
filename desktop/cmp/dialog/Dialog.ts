/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps, StyleProps, TestSupportProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import type {ReactElement, ReactNode, SyntheticEvent} from 'react';
import {createElement} from 'react';
import {DialogImpl} from './impl/DialogImpl';
import './Dialog.scss';

export interface DialogProps extends HoistProps, StyleProps, TestSupportProps {
    /** True to show the dialog. */
    isOpen?: boolean;

    /** Called when the user asks to close the dialog - by Escape, the close button or a click outside. */
    onClose?: (e?: SyntheticEvent | Event) => void;

    /** Title shown in a header bar. With no title, the dialog has no header. */
    title?: ReactNode;

    /** Icon shown before the title. */
    icon?: ReactElement;

    /** False to omit the close button from the header. Default true. */
    isCloseButtonShown?: boolean;

    /** False to keep the dialog open on a click outside it. Default true. */
    canOutsideClickClose?: boolean;

    /** False to keep the dialog open when Escape is pressed. Default true. */
    canEscapeKeyClose?: boolean;

    /** False to leave focus where it is when the dialog opens. Default true. */
    autoFocus?: boolean;

    /** False to let keyboard focus leave the open dialog. Default true. */
    enforceFocus?: boolean;

    /** False to leave focus in the dialog's place when it closes. Default true. */
    shouldReturnFocusOnClose?: boolean;

    /**
     * False to create the dialog's portal when first rendered, rather than first opened, and keep
     * it while closed - so popups opened within the dialog's content always stack above it.
     */
    lazy?: boolean;

    /** Element to render the dialog in. Default the container set by `portalContainerProvider`. */
    portalContainer?: HTMLElement;
}

/**
 * A modal dialog, shown over the app with a backdrop. While open it holds keyboard focus, closes
 * on Escape or a click outside it, and stops the page behind it from scrolling.
 *
 * For alerts and confirmations, use `XH.message()` and `XH.confirm()` instead.
 */
export const [Dialog, dialog] = hoistCmp.withFactory<DialogProps>({
    displayName: 'Dialog',
    model: false,

    render(props) {
        return createElement(DialogImpl, props);
    }
});
