/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button, dialog} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory, XH} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {textAreaField} from '@xh/hoist/cmp/form';
import {toolbar} from '@xh/hoist/cmp/toolbar';
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

        const model = this.model;
        return dialog({
            title: 'Submit Feedback',
            style: {width: 450},
            isOpen: true,
            onClose: this.onCloseClick,
            canOutsideClickClose: false,
            items: [
                textAreaField({
                    placeholder: 'Please enter your comments...',
                    style: {height: 250, marginBottom: 2},
                    model,
                    field: 'feedback'
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
        this.model.submitFeedback();
    }

    onCloseClick = () => {
        this.model.close();
    }
}
export const feedbackDialog = elemFactory(FeedbackDialog);
