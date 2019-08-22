/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponentFactory, useLocalModel} from '@xh/hoist/core';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {refreshButton} from '@xh/hoist/desktop/cmp/button';
import {chart} from '@xh/hoist/desktop/cmp/chart';
import {Icon} from '@xh/hoist/icon';
import {VisitsChartModel} from './VisitsChartModel';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';


export const visitsChart = hoistComponentFactory(() => {
    const model = useLocalModel(VisitsChartModel);
    return panel({
        mask: model.loadModel,
        icon: Icon.users(),
        title: 'Unique Daily Visitors',
        item: chart({model: model.chartModel}),
        bbar: renderToolbar(model),
        model: {
            defaultSize: 500,
            side: 'bottom',
            prefName: 'xhAdminActivityChartSize'
        }
    });
});

function renderToolbar(model) {
    return [
        renderDateInput({model, bind: 'startDate'}),
        Icon.angleRight(),
        renderDateInput({model, bind: 'endDate'}),
        toolbarSep(),
        textInput({
            model,
            bind: 'username',
            placeholder: 'Username',
            enableClear: true,
            width: 150
        }),
        refreshButton({model})
    ];
}

function renderDateInput(args) {
    return dateInput({
        popoverPosition: 'top-left',
        valueType: 'localDate',
        width: 120,
        ...args
    });
}
