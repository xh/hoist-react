/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {clientErrorsView} from './clienterrors/ClientErrorsView';
import {feedbackPanel} from './feedback/FeedbackPanel';
import {activityTrackingView} from './tracking/ActivityTrackingView';
import './ActivityTab.scss';

export const activityTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.activity',
            switcher: {orientation: 'left'},
            tabs: [
                {id: 'tracking', icon: Icon.analytics(), content: activityTrackingView},
                {id: 'clientErrors', icon: Icon.warning(), content: clientErrorsView},
                {id: 'feedback', icon: Icon.comment(), content: feedbackPanel}
            ]
        }
    })
);
