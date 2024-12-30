/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {FeedbackDialogModel} from '@xh/hoist/appcontainer/FeedbackDialogModel';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {textArea} from '@xh/hoist/mobile/cmp/input';
import './FeedbackDialog.scss';

/**
 * @internal
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
                bind: 'message',
                height: 250
            }),
            buttons: [
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
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
