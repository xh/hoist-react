/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import './ActivityTab.scss';
import {clientErrorsPanel} from './clienterrors/ClientErrorsPanel';
import {feedbackPanel} from './feedback/FeedbackPanel';
import {activityTrackingPanel} from './tracking/ActivityTrackingPanel';

export const activityTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.activity',
            switcher: {orientation: 'left'},
            tabs: [
                {id: 'tracking', icon: Icon.analytics(), content: activityTrackingPanel},
                {id: 'clientErrors', icon: Icon.warning(), content: clientErrorsPanel},
                {id: 'feedback', icon: Icon.comment(), content: feedbackPanel}
            ]
        }
    })
);
