/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';

import './Message.scss';
import {MessageModel} from '@xh/hoist/core/appcontainer/MessageModel';

/**
 * A modal dialog that supports imperative alert/confirm.
 *
 * @private
 */
@HoistComponent
export class Message extends Component {

    static modelClass = MessageModel;
    baseClassName = 'xh-message';

    render() {
        const model = this.model,
            isOpen = model && model.isOpen;

        if (!isOpen) return null;

        return dialog({
            isOpen: true,
            isCloseButtonShown: false,
            title: model.title,
            icon: model.icon,
            className: this.getClassName(),
            items: [
                dialogBody(
                    model.message,
                    this.renderInput()
                ),
                toolbar(this.renderButtons())
            ],
            ...this.props
        });
    }

    renderInput() {
        const {formModel, input} = this.model;
        if (!formModel) return null;
        return form({
            model: formModel,
            fieldDefaults: {commitOnChange: true, minimal: true, label: null},
            item: formField({
                field: 'value',
                item: withDefault(input.item, textInput({autoFocus: true}))
            })
        });
    }

    renderButtons() {
        const {formModel, confirmText, cancelText, confirmIntent, cancelIntent} = this.model;
        return [
            filler(),
            button({
                text: cancelText,
                omit: !cancelText,
                intent: cancelIntent,
                onClick: () => this.model.doCancel()
            }),
            button({
                text: confirmText,
                intent: confirmIntent,
                disabled: formModel ? !formModel.isValid : false,
                onClick: () => this.model.doConfirmAsync()
            })
        ];
    }

}
export const message = elemFactory(Message);
