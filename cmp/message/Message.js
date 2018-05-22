/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/cmp/toolbar';
import {dialog, dialogBody, button} from '@xh/hoist/kit/blueprint';

/**
 * A modal dialog that supports imperative alert/confirm.
 * @see MessageModel for supported configuration options.
 */
@HoistComponent()
class Message extends Component {

    static baseCls = 'xh-message';

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
