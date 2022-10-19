/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {MemoryMonitorModel} from '@xh/hoist/admin/tabs/server/memory/MemoryMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {getApp} from '@xh/hoist/admin/AppModel';

export const memoryMonitorPanel = hoistCmp.factory({
    model: creates(MemoryMonitorModel),

    render({model}) {

        const {readonly} = getApp();
        return panel({
            tbar: [
                button({
                    text: 'Take Snapshot',
                    icon: Icon.camera(),
                    omit: readonly,
                    onClick: () => model.takeSnapshotAsync()
                }),
                button({
                    text: 'Request GC',
                    icon: Icon.trash(),
                    intent: 'danger',
                    omit: readonly,
                    onClick: () => model.requestGcAsync()
                }),
                filler(),
                gridCountLabel({unit: 'snapshot'}),
                '-',
                exportButton()
            ],
            items: [
                grid(),
                panel({
                    model: {
                        side: 'bottom',
                        defaultSize: 400
                    },
                    item: chart()
                })
            ],
            mask: 'onLoad'
        });
    }
});
