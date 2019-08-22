/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {dialog} from '@xh/hoist/kit/blueprint';
import {hoistComponentFactory, useProvidedModel} from '@xh/hoist/core';
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
export const feedbackDialog = hoistComponentFactory(
    (props) => {
        const model = useProvidedModel(FeedbackDialogModel, props);
        if (!model.isOpen) return null;

        return dialog({
            title: 'Submit Feedback',
            style: {width: 450},
            isOpen: true,
            onClose: () => model.hide(),
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
                        onClick: () => model.hide()
                    }),
                    button({
                        text: 'Send',
                        intent: 'success',
                        disabled: !model.message,
                        onClick: () => model.submitAsync()
                    })
                )
            ]
        });
    }
);
