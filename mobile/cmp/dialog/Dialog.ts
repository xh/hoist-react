/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {ReactElement, ReactNode} from 'react';
import {dialogContainer} from './impl/DialogContainer';
import './Dialog.scss';

export interface DialogProps extends HoistProps {
    isOpen?: boolean;
    /** True (default) to close when the backdrop is tapped or Escape is pressed. */
    isCancelable?: boolean;
    onCancel?: () => void;
    icon?: ReactElement;
    title?: ReactNode;
    content?: ReactNode;
    buttons?: ReactNode[];
}

/**
 * A modal dialog for mobile, with a title bar, content area and optional row of buttons.
 */
export const [Dialog, dialog] = hoistCmp.withFactory<DialogProps>({
    displayName: 'Dialog',
    className: 'xh-dialog',
    model: false,

    render({className, isOpen, isCancelable = true, onCancel, icon, title, content, buttons = []}) {
        if (!isOpen) return null;
        return dialogContainer({
            className,
            isCancelable,
            onCancel,
            items: [
                div({
                    className: 'xh-dialog__title',
                    items: [icon, title]
                }),
                div({
                    className: 'xh-dialog__inner',
                    item: content
                }),
                div({
                    className: 'xh-dialog__toolbar',
                    omit: !buttons.length,
                    items: buttons
                })
            ]
        });
    }
});
