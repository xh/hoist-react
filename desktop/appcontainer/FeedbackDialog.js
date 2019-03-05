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
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';

import {FeedbackDialogModel} from '@xh/hoist/core/appcontainer/FeedbackDialogModel';

/**
 * A simple dialog component to collect user feedback from directly within the application.
 * @see FeedbackService
 *
 * @private
 */
@HoistComponent
export class FeedbackDialog extends Component {

    static modelClass = FeedbackDialogModel;

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        return dialog({
            title: 'Submit Feedback',
            style: {width: 450},
            isOpen: true,
            onClose: () => this.model.hide(),
            canOutsideClickClose: false,
            items: [
                textArea({
                    placeholder: 'Please enter your comments...',
                    width: null,
                    height: 250,
                    style: {marginBottom: 2},
                    commitOnChange: true,
                    model,
                    bind: 'message'
                }),
                toolbar(
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: () => this.model.hide()
                    }),
                    button({
                        text: 'Send',
                        intent: 'success',
                        disabled: !model.message,
                        onClick: () => this.model.submitAsync()
                    })
                )
            ]
        });
    }
}
export const feedbackDialog = elemFactory(FeedbackDialog);
