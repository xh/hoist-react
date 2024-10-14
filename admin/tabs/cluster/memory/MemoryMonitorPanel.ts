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
import {filler, fragment, span, vbox, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSeparator} from '@xh/hoist/desktop/cmp/toolbar';
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
            dumpDisabled = isNil(model.heapDumpDir);

        return toolbar(
            instanceSelect(),
            fragment({
                omit: readonly || isPastInstance,
                items: [
                    button({
                        text: 'Take Snapshot',
                        icon: Icon.camera(),
                        onClick: () => model.takeSnapshotAsync()
                    }),
                    toolbarSeparator(),
                    button({
                        text: 'Request GC',
                        icon: Icon.trash(),
                        onClick: () => model.requestGcAsync()
                    }),
                    toolbarSeparator(),
                    button({
                        text: 'Dump Heap',
                        icon: Icon.fileArchive(),
                        disabled: dumpDisabled,
                        tooltip: dumpDisabled
                            ? 'Missing required config xhMemoryMonitoringConfig.heapDumpDir'
                            : null,
                        onClick: () => model.dumpHeapAsync()
                    })
                ]
            }),
            filler(),
            gridCountLabel({unit: 'snapshot'}),
            '-',
            exportButton()
        );
    }
});

const instanceSelect = hoistCmp.factory<MemoryMonitorModel>({
    render({model}) {
        const {pastInstances, pastInstance, instanceName} = model,
            options = [{value: null, label: instanceName, lastUpdated: null}] as any;
        pastInstances?.forEach(it => {
            options.push({value: it, label: it.name, lastUpdated: it.lastUpdated});
        });
        return fragment(
            select({
                bind: 'pastInstance',
                width: 90,
                menuWidth: 120,
                enableFilter: false,
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true,
                options,
                optionRenderer: it =>
                    vbox({
                        items: [
                            it.label,
                            vspacer(3),
                            span({
                                className: 'xh-text-color-muted xh-font-size-small',
                                item: it.lastUpdated
                                    ? fmtDate(it.lastUpdated, 'MMM D HH:mm')
                                    : 'running'
                            })
                        ]
                    })
            }),
            span({
                className: 'xh-text-color-muted xh-font-size-small',
                item: pastInstance ? '@ ' + fmtDate(pastInstance.lastUpdated, 'MMM D HH:mm') : ''
            })
        );
    }
});
