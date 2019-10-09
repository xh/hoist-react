/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel, uses} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {dialog as onsenDialog} from '@xh/hoist/kit/onsen';

import './Dialog.scss';

/**
 * A wrapper around Onsen's dialog, with support for standard layout + styling, titles and buttons
 */
export const [Dialog, dialog] = hoistCmp.withFactory({
    displayName: 'Dialog',
    className: 'xh-dialog',
    model: false, memo: false,

    render({className, isOpen, onCancel, icon, title, content, buttons = []}) {

        const contextModel = useContextModel('*');

        if (!isOpen) return null;

        return onsenDialog({
            isOpen: true,
            isCancelable: true,
            onCancel,
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

    render({children}) {
        return children;
    }
});