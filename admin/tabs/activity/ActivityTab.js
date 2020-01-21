/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {clientErrorPanel} from './clienterrors/ClientErrorPanel';
import {feedbackPanel} from './feedback/FeedbackPanel';
import {trackingPanel} from './tracking/TrackingPanel';

export const activityTab = hoistCmp.factory(
    () => tabContainer({
        model: {
            route: 'default.activity',
            switcherPosition: 'left',
            tabs: [
                {id: 'tracking', icon: Icon.analytics(), content: trackingPanel},
                {id: 'clientErrors', icon: Icon.warning(), content: clientErrorPanel},
                {id: 'feedback', icon: Icon.comment(), content: feedbackPanel}
            ]
        }
    })
);
