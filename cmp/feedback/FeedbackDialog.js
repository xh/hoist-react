/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button, dialog} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler} from 'hoist/layout';
import {textAreaField, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class FeedbackDialog extends Component {

    render() {
        const model = this.model;
        return dialog({
            title: 'Submit Feedback',
            icon: Icon.comment(),
            style: {width: 450},
            isOpen: model.isOpen,
            onClose: this.onClose,
            fill: true,
            items: [
                textAreaField({
                    placeholder: 'Please enter your comments...',
                    style: {height: 250},
                    model,
                    field: 'feedback'
                }),
                toolbar(
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: this.onClose,
                        intent: 'success'
                    }),
                    button({
                        text: 'Send',
                        onClick: this.onSendClick,
                        intent: 'danger'
                    })
                )
            ]
        });
    }

    onSendClick = () => {
        this.model.submitFeedback();
    }

    onClose = () => {
        this.model.close();
    }
}
export const feedbackDialog = elemFactory(FeedbackDialog);