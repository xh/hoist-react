/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {hoistCmp, creates} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {withFullScreenHandler} from '@xh/hoist/desktop/cmp/fullscreenhandler/FullScreenHandler';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon/Icon';

import {ChartsModel} from './ChartsModel';

export const chartsPanel = hoistCmp.factory(
    () => panel({
        item: activityChart(),
        model: {
            side: 'bottom',
            defaultSize: 370
        }
    })
);

const activityChart = withFullScreenHandler(hoistCmp.factory({
    model: creates(ChartsModel),
    render({model, fullScreenHandlerModel, ...props}) {
        const {chartModel, activityTrackingModel} = model,
            {isFullScreen} = fullScreenHandlerModel;
        return panel({
            title: !isFullScreen ? 'Aggregate Activity Chart' :
                activityTrackingModel.queryDisplayString,
            icon: Icon.chartBar(),
            compactHeader: !isFullScreen,
            item: chart({
                model: chartModel,
                key: chartModel.xhId
            }),
            headerItems: [
                button({
                    icon: !isFullScreen ? Icon.openExternal() : Icon.close(),
                    onClick: () => fullScreenHandlerModel.toggleFullScreen()
                })
            ],
            bbar: [metricSwitcher({multiline: true})],
            height: '100%',
            ...props
        });
    }
}),
{
    style: {
        width: '90vw',
        height: '60vh'
    }
});

const metricSwitcher = hoistCmp.factory(
    ({model, multiline}) => {
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
    }
);
