/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {MemoryMonitorModel} from '@xh/hoist/admin/tabs/cluster/memory/MemoryMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {isNil} from 'lodash';

export const memoryMonitorPanel = hoistCmp.factory({
    model: creates(MemoryMonitorModel),

    render({model}) {
        if (!model.enabled) {
            return errorMessage({
                error: 'Memory Monitoring disabled via xhMemoryMonitoringConfig.'
            });
        }

        const {readonly} = AppModel,
            dumpDisabled = isNil(model.heapDumpDir);
        return panel({
            bbar: [
                button({
                    text: 'Take Snapshot',
                    icon: Icon.camera(),
                    omit: readonly,
                    onClick: () => model.takeSnapshotAsync()
                }),
                '-',
                button({
                    text: 'Request GC',
                    icon: Icon.trash(),
                    omit: readonly,
                    onClick: () => model.requestGcAsync()
                }),
                '-',
                button({
                    text: 'Dump Heap',
                    icon: Icon.fileArchive(),
                    omit: readonly,
                    disabled: dumpDisabled,
                    tooltip: dumpDisabled
                        ? 'Missing required config xhMemoryMonitoringConfig.heapDumpDir'
                        : null,
                    onClick: () => model.dumpHeapAsync()
                }),
                filler(),
                gridCountLabel({unit: 'snapshot'}),
                '-',
                exportButton()
            ],
            items: [
                grid(),
                panel({
                    modelConfig: {
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
