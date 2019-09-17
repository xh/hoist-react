/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {ClientErrorPanel} from './clienterrors/ClientErrorPanel';
import {FeedbackPanel} from './feedback/FeedbackPanel';
import {TrackingPanel} from './tracking/TrackingPanel';

export const ActivityTab = hoistCmp(
    () => tabContainer({
        model: {
            route: 'default.activity',
            switcherPosition: 'left',
            tabs: [
                {id: 'tracking', icon: Icon.analytics(), content: TrackingPanel},
                {id: 'clientErrors', icon: Icon.warning(), content: ClientErrorPanel},
                {id: 'feedback', icon: Icon.comment(), content: FeedbackPanel}
            ]
        }
    })
);
