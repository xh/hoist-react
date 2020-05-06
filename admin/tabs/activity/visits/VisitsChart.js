/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {creates, hoistCmp} from '@xh/hoist/core';
import {refreshButton} from '@xh/hoist/desktop/cmp/button';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {VisitsChartModel} from './VisitsChartModel';

export const visitsChart = hoistCmp.factory({
    model: creates(VisitsChartModel),

    render() {
        return panel({
            mask: 'onLoad',
            icon: Icon.users(),
            title: 'Unique Daily Visitors',
            item: chart(),
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory(
    () => toolbar(
        dateInput({bind: 'startDate', ...dateProps}),
        Icon.angleRight(),
        dateInput({bind: 'endDate', ...dateProps}),
        toolbarSep(),
        textInput({
            bind: 'username',
            placeholder: 'Username',
            enableClear: true,
            width: 150
        }),
        refreshButton()
    )
);

const dateProps = {
    popoverPosition: 'top-left',
    valueType: 'localDate',
    width: 120
};
