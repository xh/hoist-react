/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {textArea} from '@xh/hoist/desktop/cmp/form';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';

/**
 * A simple dialog component to collect user feedback from directly within the application.
 * @see FeedbackService
 *
 * @private
 */
@HoistComponent
export class FeedbackDialog extends Component {

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        return dialog({
            title: 'Submit Feedback',
            style: {width: 450},
            isOpen: true,
            onClose: this.onCloseClick,
            canOutsideClickClose: false,
            items: [
                textArea({
                    placeholder: 'Please enter your comments...',
                    style: {height: 250, marginBottom: 2},
                    model,
                    field: 'message'
                }),
                toolbar(
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: this.onCloseClick
                    }),
                    button({
                        text: 'Send',
                        intent: 'success',
                        onClick: this.onSendClick
                    })
                )
            ]
        });
    }

    onSendClick = () => {
        this.model.submitAsync();
    }

    onCloseClick = () => {
        this.model.hide();
    }
}
export const feedbackDialog = elemFactory(FeedbackDialog);
