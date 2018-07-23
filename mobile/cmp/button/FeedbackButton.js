/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {toolbarButton} from '@xh/hoist/kit/onsen';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for the XH feedback dialog
 * Accepts props documented below as well as any supported by Blueprint's Button.
 *
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
@HoistComponent()
export class FeedbackButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func
    };

    render() {
        const {icon, onClick, ...rest} = this.props;
        return toolbarButton({
            item: icon || Icon.comment(),
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