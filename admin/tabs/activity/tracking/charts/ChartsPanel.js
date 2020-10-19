/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon/Icon';
import {dialog} from '@xh/hoist/kit/blueprint';

import {ChartsModel} from './ChartsModel';

export const chartsPanel = hoistCmp.factory({
    model: uses(ChartsModel),
    render({model, ...props}) {
        const {chartModel} = model;

        return panel({
            title: 'Aggregate Activity Chart',
            icon: Icon.chartBar(),
            compactHeader: true,
            items: [
                chart({
                    model: chartModel,
                    key: chartModel.xhId
                }),
                chartDialog()
            ],
            headerItems: [
                button({
                    icon: Icon.openExternal(),
                    onClick: () => model.toggleDialog()
                })
            ],
            bbar: [metricSwitcher({multiline: true})],
            model: {
                side: 'bottom',
                defaultSize: 370
            },
            ...props
        });
    }
});

const chartDialog = hoistCmp.factory(
    ({model}) => {
        const {chartModel, parentModel} = model;
        if (!model.showDialog) return null;

        return dialog({
            title: parentModel.queryDisplayString,
            icon: Icon.chartBar(),
            style: {
                width: '90vw',
                height: '60vh'
            },
            isOpen: true,
            item: panel({
                item: chart({
                    model: chartModel,
                    key: `${chartModel.xhId}-dialog`
                }),
                bbar: [
                    filler(),
                    metricSwitcher(),
                    filler(),
                    button({
                        text: 'Close',
                        onClick: () => model.toggleDialog()
                    })
                ]
            }),
            onClose: () => model.toggleDialog()
        });
    }
);

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
                    outlined: true,
                    flex: 1,
                    value: 'entryCount'
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
                    outlined: true,
                    flex: 1,
                    value: 'elapsed'
                })
            ]
        });
    }
);
