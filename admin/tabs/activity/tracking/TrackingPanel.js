/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {activityGrid} from './ActivityGrid';

export const trackingPanel = hoistCmp.factory(
    () => activityGrid()
);
