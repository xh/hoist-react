/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler} from 'hoist/layout';
import {toolbar} from 'hoist/cmp';
import {dialog, dialogBody, button} from 'hoist/kit/blueprint';

/**
 * A modal dialog that supports imperative alert/confirm.
 * @see MessageModel for supported configuration options.
 */
@hoistComponent()
class Message extends Component {

    render() {
        const model = this.model,
            isOpen = model && model.isOpen;

        if (!isOpen) return null;

        return dialog({
            isOpen: true,
            isCloseButtonShown: false,
            title: model.title,
            icon: model.icon,
            items: [
                dialogBody(model.message),
                toolbar(this.getButtons())
            ],
            ...this.props
        });
    }

    getButtons() {
        const {confirmText, cancelText, confirmIntent, cancelIntent} = this.model;
        return [
            filler(),
            button({
                text: cancelText,
                omit: !cancelText,
                intent: cancelIntent,
                onClick: this.onCancel
            }),
            button({
                text: confirmText,
                intent: confirmIntent,
                onClick: this.onConfirm
            })
        ];
    }

    onConfirm = () =>   {this.model.doConfirm()}
    onCancel = () =>    {this.model.doCancel()}
}
export const message = elemFactory(Message);
