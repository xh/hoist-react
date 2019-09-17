/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, creates} from '@xh/hoist/core';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {refreshButton} from '@xh/hoist/desktop/cmp/button';
import {chart} from '@xh/hoist/desktop/cmp/chart';
import {Icon} from '@xh/hoist/icon';
import {VisitsChartModel} from './VisitsChartModel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';


export const visitsChart = hoistCmp.factory({
    model: creates(VisitsChartModel),

    render({model}) {
        return panel({
            mask: model.loadModel,
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
        dateInput({bind: 'startDate', dateProps}),
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
