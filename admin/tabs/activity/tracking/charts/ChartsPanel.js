/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';

import {ChartsModel} from './ChartsModel';

export const chartsPanel = hoistCmp.factory({
    model: uses(ChartsModel),
    render({model, ...props}) {
        const {chartModel} = model;

        return panel({
            items: [
                chart({
                    model: chartModel,
                    key: chartModel.xhId
                })
            ],
            bbar: [metricSwitcher()],
            model: {
                side: 'bottom',
                defaultSize: 370
            },
            ...props
        });
    }
});

const metricSwitcher = hoistCmp.factory(
    ({model}) => {
        return buttonGroupInput({
            bind: 'metric',
            flex: 1,
            items: [
                button({
                    text: model.getLabelForMetric('entryCount'),
                    outlined: true,
                    flex: 1,
                    value: 'entryCount'
                }),
                button({
                    text: model.getLabelForMetric('count'),
                    value: 'count',
                    outlined: true,
                    flex: 1,
                    omit: !model.secondaryDim
                }),
                button({
                    text: model.getLabelForMetric('elapsed'),
                    outlined: true,
                    flex: 1,
                    value: 'elapsed'
                })
            ]
        });
    }
);
