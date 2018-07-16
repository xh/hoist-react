/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textAreaField} from '@xh/hoist/mobile/cmp/form';

import './FeedbackDialog.scss';
import {FeedbackDialogModel} from './FeedbackDialogModel';

/**
 * A simple dialog component to collect user feedback from directly within the application.
 * @see FeedbackService
 *
 * @private
 */
@HoistComponent()
export class FeedbackDialog extends Component {

    localModel = new FeedbackDialogModel();

    render() {
        if (!XH.feedbackIsOpen) return null;

        return dialog({
            title: 'Submit Feedback',
            cls: 'xh-feedback-dialog',
            isOpen: true,
            onCancel: this.onCancelClick,
            content: textAreaField({
                placeholder: 'Please enter your comments...',
                model: this.model,
                field: 'feedback'
            }),
            buttons: [
                button({
                    text: 'Cancel',
                    modifier: 'quiet',
                    onClick: this.onCancelClick
                }),
                button({
                    text: 'Send',
                    onClick: this.onSendClick
                })
            ]
        });
    }

    onSendClick = () => {
        this.model.submitFeedback();
    }

    onCancelClick = () => {
        this.model.close();
    }

}
export const feedbackDialog = elemFactory(FeedbackDialog);
