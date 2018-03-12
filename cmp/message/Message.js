/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler} from 'hoist/layout';
import {dialog, dialogBody, dialogFooter, dialogFooterActions, button} from 'hoist/kit/blueprint';

/**
 * A modal dialog that supports imperative alert/confirm.
 */
@hoistComponent()
class Message extends Component {

    render() {
        const model = this.model,
            isOpen = model && model.isOpen;

        if (!isOpen) return null;

        // blueprint alert() does not support title, use dialog()
        return dialog({
            isOpen: true,
            isCloseButtonShown: false,
            title: model.title,
            icon: model.icon,
            items: [
                dialogBody(model.message),
                dialogFooter(
                    dialogFooterActions(this.getButtons())
                )
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
