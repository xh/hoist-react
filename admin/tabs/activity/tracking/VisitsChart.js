/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {uses, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {select, switchInput} from '../../../../desktop/cmp/input'; //TODO: fix imports
import {ActivityModel} from './ActivityModel';

export const visitsChart = hoistCmp.factory({
    model: uses(ActivityModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            icon: Icon.users(),
            title: 'Unique Daily Visitors',
            item: chart(),
            bbar: bbar(),
            model: {
                defaultSize: 500,
                side: 'bottom',
                prefName: 'xhAdminActivityChartSize'
            }
        });
    }
});

const bbar = hoistCmp.factory(
    () => toolbar(
        select({
            bind: 'chartType',
            options: [{label: 'Bar Chart', value: 'column'}, {label: 'Timeseries', value: 'line'}]
        })
    )
);
