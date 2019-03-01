/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for the XH feedback dialog.
 *
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
@HoistComponent
export class FeedbackButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func
    };

    render() {
        const {icon, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.comment({className: 'fa-flip-horizontal'}),
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