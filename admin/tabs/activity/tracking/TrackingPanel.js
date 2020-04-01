/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';

import {activityGrid} from './ActivityGrid';
import {visitsChart} from './VisitsChart';

export const trackingPanel = hoistCmp.factory(
    () => vframe(activityGrid(), visitsChart())
);
