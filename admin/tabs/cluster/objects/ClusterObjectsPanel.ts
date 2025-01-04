/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, label, placeholder} from '@xh/hoist/cmp/layout';
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
import {ClusterObjectsModel} from './ClusterObjectsModel';
import './ClusterObjects.scss';

export const clusterObjectsPanel = hoistCmp.factory({
    displayName: 'DistributedObjectsPanel',
    model: creates(ClusterObjectsModel),

    render({model}) {
        return panel({
            tbar: tbar(),
            item: hframe(
                grid({
                    model: model.gridModel,
                    agOptions: {groupDefaultExpanded: 2}
                }),
                adminSpecsPanel()
            ),
            bbar: bbar(),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const tbar = hoistCmp.factory<ClusterObjectsModel>(({model}) => {
    const {counts, isSingleInstance} = model;
    return toolbar({
        items: [
            switchInput({
                omit: isSingleInstance,
                label: 'Show objects w/o comparisons',
                bind: 'showInactive'
            }),
            div({
                className: 'xh-distributed-objects-result-count',
                omit: isSingleInstance,
                items: [
                    toolbarSep(),
                    Icon.error({prefix: 'fas', className: 'xh-red'}),
                    label(`${pluralize(`object`, counts['failed'], true)} with mismatches`)
                ]
            }),
            div({
                className: 'xh-distributed-objects-result-count',
                omit: isSingleInstance,
                items: [
                    toolbarSep(),
                    Icon.checkCircle({prefix: 'fas', className: 'xh-green'}),
                    label(`${pluralize(`object`, counts['passed'], true)} compared OK`)
                ]
            }),
            div({
                className: 'xh-distributed-objects-result-count',
                omit: isSingleInstance || !model.showInactive,
                items: [
                    toolbarSep(),
                    Icon.disabled({prefix: 'fas', className: 'xh-gray'}),
                    label(`${pluralize(`object`, counts['inactive'], true)} w/o comparisons`)
                ]
            }),
            filler(),
            'As of',
            relativeTimestamp({bind: 'startTimestamp'}),
            toolbarSep(),
            'Took ',
            fmtNumber(model.runDurationMs, {label: 'ms'})
        ]
    });
});

const adminSpecsPanel = hoistCmp.factory<ClusterObjectsModel>(({model}) => {
    const {
        instanceName,
        selectedAdminStats,
        selectedRecordName,
        selectedRecordType,
        detailGridModel
    } = model;
    return panel({
        title: selectedRecordName
            ? `${selectedRecordType}: ${selectedRecordName}`
            : 'Admin Stats by Instance',
        omit: !detailGridModel,
        icon: Icon.diff(),
        compactHeader: true,
        modelConfig: {
            side: 'right',
            defaultSize: '70%',
            collapsible: false
        },
        item: selectedRecordName
            ? [
                  grid({model: detailGridModel, flex: 1}),
                  panel({
                      title: `Instance: ${instanceName}`,
                      omit: !instanceName,
                      compactHeader: true,
                      modelConfig: {
                          side: 'bottom',
                          defaultSize: '80%',
                          collapsible: false
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
                  })
              ]
            : placeholder(Icon.grip(), 'Select an object')
    });
});

const bbar = hoistCmp.factory<ClusterObjectsModel>(({model}) => {
    return toolbar(
        recordActionBar({
            selModel: model.gridModel.selModel,
            actions: [model.clearHibernateCachesAction]
        }),
        '-',
        button({
            text: 'Clear All Hibernate Caches',
            icon: Icon.reset(),
            intent: 'warning',
            tooltip: 'Clear the Hibernate caches using the native Hibernate API',
            onClick: () => model.clearAllHibernateCachesAsync()
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
