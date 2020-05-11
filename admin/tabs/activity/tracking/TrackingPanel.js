/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {creates} from '../../../../core';
import {activityGrid} from './ActivityGrid';
import {TrackingModel} from './TrackingModel';
import {visitsChart} from './VisitsChart';

export const trackingPanel = hoistCmp.factory({
    model: creates(TrackingModel),
    render({model}) {
        return vframe(
            activityGrid(),
            visitsChart({omit: model.activityGridModel.dimChooserModel.value[0] !== 'cubeDay'})
        );
    }
});
