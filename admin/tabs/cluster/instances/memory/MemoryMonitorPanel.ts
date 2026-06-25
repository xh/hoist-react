/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {MemoryMonitorModel} from '@xh/hoist/admin/tabs/cluster/instances/memory/MemoryMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {code, filler, fragment, hbox, hspacer, span, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSeparator} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {isEmpty, isNil} from 'lodash';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';

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
                        defaultSize: '50%'
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
            fragment({
                omit: readonly,
                items: [
                    button({
                        text: 'Take Snapshot',
                        icon: Icon.camera(),
                        disabled: isPastInstance,
                        onClick: () => model.takeSnapshotAsync()
                    }),
                    toolbarSeparator(),
                    button({
                        text: 'Request GC',
                        icon: Icon.trash(),
                        disabled: isPastInstance,
                        onClick: () => model.requestGcAsync()
                    }),
                    toolbarSeparator(),
                    button({
                        text: 'Dump Heap',
                        icon: Icon.fileArchive(),
                        disabled: dumpDisabled || isPastInstance,
                        tooltip: dumpDisabled
                            ? 'Missing required config xhMemoryMonitoringConfig.heapDumpDir'
                            : null,
                        onClick: () => model.dumpHeapAsync()
                    })
                ]
            }),
            '-',
            instanceSelect(),
            instanceClear(),
            filler(),
            gridCountLabel({unit: 'snapshot'}),
            '-',
            exportButton()
        );
    }
});

const instanceSelect = hoistCmp.factory<MemoryMonitorModel>({
    render({model}) {
        const {pastInstance, pastInstances} = model;
        return popover({
            position: 'top-left',
            minimal: true,
            item: fragment(
                button({
                    icon: Icon.history(),
                    minimal: true,
                    text: instanceDisplay({instance: pastInstance}),
                    disabled: isEmpty(pastInstances),
                    tooltip: 'View past instances'
                })
            ),
            content: panel({
                icon: Icon.history(),
                title: 'Past Instances',
                compactHeader: true,
                item: menu({
                    items: pastInstances.map(it =>
                        menuItem({
                            text: instanceDisplay({instance: it}),
                            onClick: () => (model.pastInstance = it)
                        })
                    )
                })
            })
        });
    }
});

const instanceDisplay = hoistCmp.factory<MemoryMonitorModel>({
    render({instance}) {
        if (!instance) return null;
        return hbox(
            code(instance.name),
            hspacer(10),
            span({
                className: 'xh-text-color-muted xh-font-size-small',
                item: fmtDate(instance.lastUpdated, 'MMM D h:mma')
            })
        );
    }
});

const instanceClear = hoistCmp.factory<MemoryMonitorModel>({
    render({model}) {
        return button({
            omit: !model.pastInstance,
            icon: Icon.x(),
            minimal: true,
            onClick: () => (model.pastInstance = null)
        });
    }
});
