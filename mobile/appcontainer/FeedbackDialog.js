/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {button} from '@xh/hoist/mobile/cmp/button';
import {textArea} from '@xh/hoist/mobile/cmp/input';

import {FeedbackDialogModel} from '@xh/hoist/appcontainer/FeedbackDialogModel';
import './FeedbackDialog.scss';

/**
 * Display Feedback form
 *
 * @private
 */
export const feedbackDialog = hoistCmp.factory({
    displayName: 'FeedbackDialog',
    model: uses(FeedbackDialogModel),

    render({model}) {
        if (!model.isOpen) return null;

        return dialog({
            title: 'Submit Feedback',
            className: 'xh-feedback-dialog',
            isOpen: true,
            onCancel: () => model.hide(),
            content: textArea({
                placeholder: 'Please enter your comments...',
                bind: 'message'
            }),
            buttons: [
                filler(),
                button({
                    text: 'Cancel',
                    modifier: 'quiet',
                    onClick: () => model.hide()
                }),
                button({
                    text: 'Send',
                    onClick: () => model.submitAsync()
                })
            ]
        });
    }
});