/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for the XH feedback dialog.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
@HoistComponent
export class FeedbackButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func
    };

    render() {
        const {icon, title, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.comment(),
            title: title || 'Feedback',
            onClick: onClick || this.onFeedbackClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onFeedbackClick = () => {
        XH.showFeedbackDialog();
    }

}
export const feedbackButton = elemFactory(FeedbackButton);