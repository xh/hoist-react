/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {creates, hoistCmp} from '@xh/hoist/core';
import {modalToggleButton} from '@xh/hoist/desktop/cmp/button';
import {checkbox, select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon/Icon';
import {AggChartModel} from './AggChartModel';

export const aggChartPanel = hoistCmp.factory({
    displayName: 'AggChartPanel',
    model: creates(AggChartModel),

    render({model, ...props}) {
        return panel({
            collapsedTitle: 'Aggregate Activity Chart',
            collapsedIcon: Icon.chartBar(),
            modelConfig: {
                modalSupport: {width: '90vw', height: '60vh'},
                side: 'bottom',
                defaultSize: 400,
                persistWith: {...model.activityTrackingModel.persistWith, path: 'aggChartPanel'}
            },
            compactHeader: true,
            item: chart({model: model.chartModel}),
            bbar: toolbar({
                items: [
                    Icon.chartBar(),
                    metricSwitcher(),
                    incWeekendsCheckbox(),
                    '-',
                    modalToggleButton()
                ]
            }),
            ...props
        });
    }
});

const metricSwitcher = hoistCmp.factory<AggChartModel>(({model}) => {
    return select({
        bind: 'metric',
        options: model.selectableMetrics,
        enableFilter: false,
        flex: 1
    });
});

const incWeekendsCheckbox = hoistCmp.factory<AggChartModel>(({model}) =>
    checkbox({
        omit: !model.showAsTimeseries,
        bind: 'incWeekends',
        label: 'Weekends',
        style: {marginLeft: '10px'}
    })
);
