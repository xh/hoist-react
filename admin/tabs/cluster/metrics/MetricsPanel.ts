/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, placeholder} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {groupingChooser} from '@xh/hoist/desktop/cmp/grouping';
import {segmentedControl} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {MetricsModel} from './MetricsModel';

export const metricsPanel = hoistCmp.factory({
    model: creates(MetricsModel),

    render({model}) {
        return panel({
            ref: model.viewRef,
            mask: 'onLoad',
            tbar: toolbar(
                groupingChooser({
                    model: model.groupingChooserModel,
                    icon: Icon.treeList(),
                    emptyText: 'Ungrouped',
                    minWidth: 200
                }),
                '-',
                segmentedControl({
                    bind: 'sourceFilter',
                    options: [
                        {value: 'all', label: 'All'},
                        {value: 'app', label: 'App'},
                        {value: 'hoist', label: 'Hoist'}
                    ]
                }),
                '-',
                recordActionBar({
                    selModel: model.gridModel.selModel,
                    actions: [model.publishAction, model.unpublishAction]
                }),
                filler(),
                relativeTimestamp({bind: 'lastLoadCompleted', prefix: 'Refreshed'}),
                '-',
                gridCountLabel({unit: 'metric'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton({gridModel: model.gridModel})
            ),
            items: [
                grid(),
                panel({
                    compactHeader: true,
                    title: model.detailPanelTitle,
                    modelConfig: {side: 'bottom', defaultSize: 300},
                    item: model.selectedMetricNames.length
                        ? grid({model: model.detailGridModel})
                        : placeholder(Icon.gauge(), 'Select a metric...')
                })
            ]
        });
    }
});
