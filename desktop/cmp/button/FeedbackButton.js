/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for the XH feedback dialog.
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
@HoistComponent
export class FeedbackButton extends Component {

    static propTypes = {
        ...Button.propTypes
    };

    render() {
        const {icon, title, onClick, ...rest} = this.props;
        return button({
            icon: withDefault(icon, Icon.comment({className: 'fa-flip-horizontal'})),
            title: withDefault(title, 'Feedback'),
            onClick: withDefault(onClick, this.showFeedbackDialog),
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    showFeedbackDialog = () => {
        XH.showFeedbackDialog();
    }

}
export const feedbackButton = elemFactory(FeedbackButton);