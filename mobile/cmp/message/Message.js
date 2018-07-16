/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/kit/onsen';
import {button} from '@xh/hoist/mobile/cmp/button';

import './Message.scss';

/**
 * A modal dialog that supports imperative alert/confirm.
 *
 * @see MessageModel for supported configuration options - and an important note on built-in support
 * for showing one-off messages via convenience methods on XH (vs. needing to instantiate this
 * component directly).
 */
@HoistComponent()
class Message extends Component {

    render() {
        const model = this.model,
            isOpen = model && model.isOpen,
            {icon, title, message, confirmText, cancelText} = model,
            showToolbar = confirmText || cancelText;

        if (!isOpen) return null;

        return dialog({
            isOpen: true,
            isCancelable: true,
            onCancel: this.onCancel,
            cls: 'xh-message',
            items: [
                div({
                    cls: 'xh-message__title',
                    items: [icon, title]
                }),
                div({
                    cls: 'xh-message__inner',
                    item: message
                }),
                div({
                    cls: 'xh-message__toolbar',
                    omit: !showToolbar,
                    items: [
                        filler(),
                        button({
                            text: cancelText,
                            omit: !cancelText,
                            modifier: 'quiet',
                            onClick: this.onCancel
                        }),
                        button({
                            text: confirmText,
                            omit: !confirmText,
                            onClick: this.onConfirm
                        })
                    ]
                })
            ]
        });
    }

    onConfirm = () =>   {this.model.doConfirm()}
    onCancel = () =>    {this.model.doCancel()}

}
export const message = elemFactory(Message);
