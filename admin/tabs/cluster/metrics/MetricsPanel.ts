/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {colChooserButton, exportButton, refreshButton} from '@xh/hoist/desktop/cmp/button';
import {groupingChooser} from '@xh/hoist/desktop/cmp/grouping';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {MetricsModel} from './MetricsModel';

export const metricsPanel = hoistCmp.factory({
    model: creates(MetricsModel),

    render({model}) {
        return panel({
            ref: model.viewRef,
            item: grid(),
            mask: 'onLoad',
            tbar: toolbar(
                'Group by:',
                groupingChooser({maxWidth: 300}),
                select({
                    bind: 'instance',
                    options: model.instances,
                    enableClear: true,
                    placeholder: 'All instances...',
                    width: 200
                }),
                select({
                    bind: 'source',
                    options: model.sources,
                    enableClear: true,
                    placeholder: 'All sources...',
                    width: 160
                }),
                filler(),
                gridCountLabel({unit: 'metric'}),
                storeFilterField(),
                colChooserButton(),
                exportButton(),
                refreshButton()
            )
        });
    }
});
