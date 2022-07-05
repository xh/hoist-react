/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';

/**
 * Convenience Button preconfigured for use as a trigger for the XH feedback dialog.
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
export const [FeedbackButton, feedbackButton] = hoistCmp.withFactory({
    displayName: 'FeedbackButton',
    model: false,

    render({
        icon = Icon.comment({className: 'fa-flip-horizontal'}),
        onClick = () => XH.showFeedbackDialog(),
        ...props
    }) {
        return button({icon, onClick, ...props});
    }
});
FeedbackButton.propTypes = Button.propTypes;
