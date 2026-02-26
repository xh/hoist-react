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
import {groupingChooser} from '@xh/hoist/desktop/cmp/grouping';
import {picker} from '@xh/hoist/desktop/cmp/input';
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
                picker({
                    bind: 'sourceFilter',
                    options: model.sourceOptions,
                    enableMulti: true,
                    enableClear: true,
                    width: 200,
                    buttonProps: {icon: Icon.tag()},
                    displayNoun: 'source',
                    buttonTextRenderer: (selOpts, allOpts) => {
                        const count = selOpts.length;
                        if (!count || count === allOpts.length) return 'All sources';
                        if (count === 1) return `Source: ${selOpts[0].label}`;
                        return `${count} sources`;
                    }
                }),
                filler(),
                relativeTimestamp({bind: 'lastLoadCompleted'}),
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
