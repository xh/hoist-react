/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {refreshButton} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {MetricsModel} from './MetricsModel';

export const metricsPanel = hoistCmp.factory({
    model: creates(MetricsModel),

    render({model}) {
        return panel({
            ref: model.viewRef,
            mask: 'onLoad',
            tbar: toolbar(
                'Source:',
                select({
                    bind: 'sourceFilter',
                    options: model.sourceOptions,
                    enableMulti: true,
                    placeholder: 'All',
                    width: 200
                }),
                filler(),
                relativeTimestamp({bind: 'lastLoadDate'}),
                '-',
                gridCountLabel({unit: 'metric'}),
                storeFilterField(),
                refreshButton()
            ),
            item: vframe(
                grid(),
                panel({
                    compactHeader: true,
                    title: model.selectedMetricName
                        ? `Variants - ${model.selectedMetricName}`
                        : 'Variants',
                    modelConfig: {side: 'bottom', defaultSize: 300},
                    item: model.selectedMetricName
                        ? grid({model: model.detailGridModel})
                        : placeholder('Choose a Metric')
                })
            )
        });
    }
});
