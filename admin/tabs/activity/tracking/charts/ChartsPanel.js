/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {uses, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSeparator} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {chart} from '@xh/hoist/cmp/chart';
import {checkbox} from '@xh/hoist/desktop/cmp/input';

import {ChartsModel} from './ChartsModel';

export const chartsPanel = hoistCmp.factory({
    model: uses(ChartsModel),
    render({model, ...props}) {
        const {chartType, dimensions} = model,
            isTimeSeries = chartType == 'timeseries';

        if (isEmpty(dimensions)) return null;
        return panel({
            items: [
                chart({
                    model: model.categoryChartModel,
                    omit: isTimeSeries
                }),
                chart({
                    model: model.timeseriesChartModel,
                    omit: !isTimeSeries
                })
            ],
            bbar: bbar(),
            model: {
                side: 'bottom',
                defaultSize: 300
            },
            ...props
        });
    }
});

const bbar = hoistCmp.factory(
    ({model}) => toolbar(
        buttonGroupInput({
            bind: 'chartType',
            items: [
                button({
                    icon: Icon.chartBar(),
                    value: 'category'
                }),
                button({
                    icon: Icon.chartLine(),
                    value: 'timeseries',
                    disabled: !model.enableTimeseries
                })
            ]
        }),
        toolbarSeparator(),
        checkbox({
            className: 'feature-series-checkbox',
            label: model.yAxisLabel,
            bind: 'showFeatureSeries'
        }),
        checkbox({
            className: 'entries-series-checkbox',
            label: 'Entries',
            bind: 'showEntriesSeries'
        }),
        checkbox({
            className: 'elapsed-series-checkbox',
            label: 'Elapsed',
            bind: 'showElapsedSeries'
        })
    )
);
