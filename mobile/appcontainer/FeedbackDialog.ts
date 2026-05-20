/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FeedbackDialogModel} from '@xh/hoist/appcontainer/FeedbackDialogModel';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
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
                height: 250,
                testId: 'xh-feedback-message'
            }),
            buttons: [
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    testId: 'xh-feedback-cancel-btn',
                    onClick: () => model.hide()
                }),
                button({
                    text: 'Send',
                    icon: Icon.mail(),
                    intent: 'primary',
                    outlined: true,
                    testId: 'xh-feedback-send-btn',
                    onClick: () => model.submitAsync()
                })
            ]
        });
    }
});
