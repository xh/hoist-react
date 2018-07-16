/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {button} from '@xh/hoist/mobile/cmp/button';

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
            {icon, title, message, cancelText, confirmText} = model,
            buttons = [];

        if (!isOpen) return null;

        if (cancelText) {
            buttons.push(button({
                text: cancelText,
                modifier: 'quiet',
                onClick: this.onCancel
            }));
        }

        if (confirmText) {
            buttons.push(button({
                text: confirmText,
                onClick: this.onConfirm
            }));
        }

        return dialog({
            isOpen,
            icon,
            title,
            buttons,
            content: message,
            onCancel: this.onCancel
        });
    }

    onConfirm = () =>   {this.model.doConfirm()}
    onCancel = () =>    {this.model.doCancel()}

}
export const message = elemFactory(Message);
