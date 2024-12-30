/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {hoistCmp, creates} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon/Icon';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {hspacer} from '@xh/hoist/cmp/layout';
import {ChartsModel} from './ChartsModel';

export const chartsPanel = hoistCmp.factory({
    model: creates(ChartsModel),
    render({model, ...props}) {
        const {chartModel, activityTrackingModel, panelModel} = model,
            {isModal} = panelModel;
        return panel({
            title: !isModal ? 'Aggregate Activity Chart' : activityTrackingModel.queryDisplayString,
            icon: Icon.chartBar(),
            model: panelModel,
            compactHeader: !isModal,
            item: chart({model: chartModel}),
            bbar: bbar(),
            height: '100%',
            ...props
        });
    }
});

const bbar = hoistCmp.factory<ChartsModel>(() =>
    toolbar(metricSwitcher({multiline: true}), hspacer(), incWeekendsCheckbox())
);

const incWeekendsCheckbox = hoistCmp.factory<ChartsModel>(({model}) =>
    checkbox({
        omit: !model.showAsTimeseries,
        bind: 'incWeekends',
        label: 'Inc Wknds'
    })
);

const metricSwitcher = hoistCmp.factory<ChartsModel>(({model, multiline}) => {
    return buttonGroupInput({
        className: 'xh-admin-activity-panel__metric-switcher',
        bind: 'metric',
        outlined: true,
        flex: 2,
        items: [
            button({
                text: model.getLabelForMetric('entryCount', multiline),
                value: 'entryCount',
                outlined: true,
                flex: 1
            }),
            button({
                text: model.getLabelForMetric('count', multiline),
                value: 'count',
                outlined: true,
                flex: 1,
                omit: !model.secondaryDim
            }),
            button({
                text: model.getLabelForMetric('elapsed', multiline),
                value: 'elapsed',
                outlined: true,
                flex: 1
            })
        ]
    });
});
