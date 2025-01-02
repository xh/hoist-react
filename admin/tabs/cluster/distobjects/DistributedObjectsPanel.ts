/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, label, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {jsonInput, switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {DistributedObjectsModel} from './DistributedObjectsModel';
import './DistributedObjects.scss';

export const distributedObjectsPanel = hoistCmp.factory({
    displayName: 'DistributedObjectsPanel',
    model: creates(DistributedObjectsModel),

    render({model}) {
        return panel({
            tbar: tbar(),
            item: hframe(
                panel({
                    item: vframe(
                        hframe(
                            grid({
                                model: model.gridModel,
                                agOptions: {groupDefaultExpanded: 2}
                            }),
                            adminSpecsPanel()
                        ),
                        detailsGridPanel()
                    ),
                    bbar: bbar()
                })
            ),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const tbar = hoistCmp.factory<DistributedObjectsModel>(({model}) => {
    const {counts, isSingleInstance} = model;
    return toolbar({
        items: [
            switchInput({
                omit: isSingleInstance,
                label: 'Show inactive',
                bind: 'showInactive'
            }),
            ...['failed', 'passed', 'inactive'].map(it =>
                div({
                    className: 'xh-distributed-objects-result-count',
                    omit: isSingleInstance || (it === 'inactive' && !model.showInactive),
                    items: [
                        toolbarSep(),
                        it === 'failed'
                            ? Icon.error({prefix: 'fas', className: 'xh-red'})
                            : it === 'passed'
                              ? Icon.checkCircle({prefix: 'fas', className: 'xh-green'})
                              : Icon.disabled({prefix: 'fas', className: 'xh-gray'}),
                        label(pluralize(`${it} comparison`, counts[it], true))
                    ]
                })
            ),
            filler(),
            'As of',
            relativeTimestamp({bind: 'startTimestamp'}),
            toolbarSep(),
            'Took ',
            fmtNumber(model.runDurationMs, {label: 'ms'})
        ]
    });
});

const adminSpecsPanel = hoistCmp.factory<DistributedObjectsModel>(({model}) => {
    const {instanceName, selectedAdminStats} = model;
    return panel({
        title: instanceName ? `Stats: ${instanceName}` : 'Stats',
        omit: !selectedAdminStats,
        compactHeader: true,
        modelConfig: {
            side: 'right',
            defaultSize: 450
        },
        item: jsonInput({
            readonly: true,
            flex: 1,
            width: '100%',
            height: '100%',
            showFullscreenButton: false,
            editorProps: {lineNumbers: false},
            value: model.fmtStats(selectedAdminStats)
        })
    });
});

const detailsGridPanel = hoistCmp.factory<DistributedObjectsModel>(({model}) => {
    const {selectedRecordName, detailGridModel} = model;
    return panel({
        title: selectedRecordName ? `Check: ${selectedRecordName}` : 'Check',
        omit: !detailGridModel,
        icon: Icon.info(),
        compactHeader: true,
        modelConfig: {
            side: 'bottom',
            defaultSize: 150
        },
        item: selectedRecordName
            ? grid({model: detailGridModel, flex: 1})
            : placeholder(Icon.grip(), 'Select an object')
    });
});

const bbar = hoistCmp.factory<DistributedObjectsModel>(({model}) => {
    return toolbar(
        recordActionBar({
            selModel: model.gridModel.selModel,
            actions: [model.clearAction]
        }),
        '-',
        button({
            text: 'Clear All Hibernate Caches',
            icon: Icon.reset(),
            intent: 'warning',
            tooltip: 'Clear the Hibernate caches using the native Hibernate API',
            onClick: () => model.clearHibernateCachesAsync()
        }),
        filler(),
        storeFilterField({
            matchMode: 'any',
            autoApply: false,
            onFilterChange: f => (model.textFilter = f)
        }),
        exportButton()
    );
});
