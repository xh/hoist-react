/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from './Button';

/**
 * Convenience Button preconfigured for use as a trigger for the XH feedback dialog.
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
export const [FeedbackButton, feedbackButton] = hoistCmp.withFactory({
    displayName: 'FeedbackButton',
    model: false,

    render(props, ref) {
        return button({
            ref,
            icon: Icon.comment({className: 'fa-flip-horizontal'}),
            title: 'Feedback',
            onClick: () => XH.showFeedbackDialog(),
            ...props
        });
    }
});
FeedbackButton.propTypes = {...Button.propTypes};

