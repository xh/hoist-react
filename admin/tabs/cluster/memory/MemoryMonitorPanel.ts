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
import {filler, fragment, hbox, span, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtDate} from '@xh/hoist/format';
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

        return panel({
            item: vframe(
                grid(),
                panel({
                    modelConfig: {
                        side: 'bottom',
                        defaultSize: 400
                    },
                    item: chart()
                })
            ),
            bbar: bbar(),
            ref: model.viewRef,
            mask: 'onLoad'
        });
    }
});

const bbar = hoistCmp.factory<MemoryMonitorModel>({
    render({model}) {
        const isPastInstance = !!model.pastInstance,
            {readonly} = AppModel,
            dumpDisabled = isNil(model.heapDumpDir) || isPastInstance;

        return toolbar(
            button({
                text: 'Take Snapshot',
                icon: Icon.camera(),
                omit: readonly,
                disabled: isPastInstance,
                onClick: () => model.takeSnapshotAsync()
            }),
            '-',
            button({
                text: 'Request GC',
                icon: Icon.trash(),
                omit: readonly,
                disabled: isPastInstance,
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
            '-',
            pastInstanceSelect(),
            filler(),
            gridCountLabel({unit: 'snapshot'}),
            '-',
            exportButton()
        );
    }
});

const pastInstanceSelect = hoistCmp.factory<MemoryMonitorModel>({
    render({model}) {
        const {pastInstances, instanceName} = model,
            options = [
                {
                    value: null,
                    label: instanceName,
                    subLabel: 'running',
                    name: instanceName,
                    lastUpdated: null
                }
            ] as any;
        pastInstances?.forEach(({name, lastUpdated}) => {
            options.push({
                value: name,
                label: name,
                subLabel: fmtDate(lastUpdated, 'MMM D HH:mm'),
                name,
                lastUpdated
            });
        });
        return fragment(
            select({
                bind: 'pastInstance',
                width: 110,
                menuWidth: 180,
                enableClear: !!model.pastInstance,
                enableFilter: false,
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                options,
                optionRenderer: it =>
                    hbox(
                        it.name,
                        filler(),
                        span({
                            className: 'xh-text-color-muted xh-font-size-small xh-align-right',
                            item: it.subLabel
                        })
                    )
            })
        );
    }
});
