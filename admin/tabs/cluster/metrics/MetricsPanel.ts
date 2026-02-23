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
