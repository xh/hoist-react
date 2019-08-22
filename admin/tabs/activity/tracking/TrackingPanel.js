/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent} from '@xh/hoist/core';
import {vframe} from '@xh/hoist/cmp/layout';

import {activityGrid} from './ActivityGrid';
import {visitsChart} from './VisitsChart';

export const TrackingPanel = hoistComponent(
    () => vframe(activityGrid(), visitsChart())
);
