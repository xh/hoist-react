/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {uses, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {hframe} from '@xh/hoist/cmp/layout';

import {chartsPanel} from '../charts/ChartsPanel';
import {activityDetailTable} from '../detail/ActivityDetailTable';
import {ChartsModel} from '../charts/ChartsModel';

export const activityDetailPanel = hoistCmp.factory({
    model: uses(ChartsModel),
    render({model}) {
        if (isEmpty(model.dimensions)) return null;
        return panel({
            items: hframe(
                activityDetailTable(),
                chartsPanel()
            ),
            model: {
                defaultSize: 380,
                side: 'bottom',
                prefName: 'xhAdminActivityChartSize'
            }
        });
    }
});