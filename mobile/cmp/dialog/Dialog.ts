/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, useContextModel, uses} from '@xh/hoist/core';
import {dialog as onsenDialog} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {ReactElement, ReactNode} from 'react';
import './Dialog.scss';

export interface DialogProps extends HoistProps {
    isOpen?: boolean;
    isCancelable?: boolean;
    onCancel?: () => void;
    icon?: ReactElement;
    title?: ReactNode;
    content?: ReactNode;
    buttons?: ReactNode[];
}

/**
 * A wrapper around Onsen's dialog, with support for standard layout + styling, titles and buttons
 */
export const [Dialog, dialog] = hoistCmp.withFactory<DialogProps>({
    displayName: 'Dialog',
    className: 'xh-dialog',
    model: false,

    render({className, isOpen, isCancelable = true, onCancel, icon, title, content, buttons = []}) {
        const contextModel = useContextModel('*');
        if (!isOpen) return null;
        return onsenDialog({
            visible: true,
            cancelable: isCancelable,
            onDialogCancel: onCancel,
            className,
            item: modelHost({
                model: contextModel,
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
            })
        });
    }
});

//-----------------------------------------------------------------
// Trampoline a model in to context to workaround the fact that
// onsenDialog appears to exist in a different react context than
// its container
//-----------------------------------------------------------------
const modelHost = hoistCmp.factory({
    model: uses('*'),
    memo: false,
    observer: false,
    render({children}) {
        return children;
    }
});
