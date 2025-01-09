/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, fragment, hframe, label} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {ClusterObjectsModel} from './ClusterObjectsModel';
import {detailPanel} from './DetailPanel';
import './ClusterObjects.scss';

export const clusterObjectsPanel = hoistCmp.factory({
    displayName: 'ClusterObjectsPanel',
    model: creates(ClusterObjectsModel),

    render({model}) {
        return panel({
            tbar: tbar(),
            item: hframe(
                panel({
                    modelConfig: {
                        side: 'left',
                        defaultSize: 475,
                        collapsible: false
                    },
                    item: grid({agOptions: {groupDefaultExpanded: 2}})
                }),
                detailPanel()
            ),
            bbar: bbar(),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const tbar = hoistCmp.factory<ClusterObjectsModel>(({model}) => {
    const {isSingleInstance} = model;
    return toolbar(
        diffBar({omit: isSingleInstance}),
        filler(),
        label('As of'),
        relativeTimestamp({bind: 'startTimestamp'}),
        '-',
        label('Took '),
        fmtNumber(model.runDurationMs, {label: 'ms'}),
        '-',
        storeFilterField({
            matchMode: 'any',
            autoApply: false,
            onFilterChange: f => (model.textFilter = f)
        }),
        exportButton()
    );
});

const diffBar = hoistCmp.factory<ClusterObjectsModel>(({model}) => {
    const {counts} = model;
    return fragment(
        Icon.diff(),
        label('Cross-instance comparisons'),
        fragment({
            omit: !counts.failed,
            items: [
                toolbarSep(),
                Icon.diff({prefix: 'fas', intent: 'danger'}),
                label(`${counts.failed} diffs`)
            ]
        }),
        fragment({
            omit: !counts.passed,
            items: [
                toolbarSep(),
                Icon.checkCircle({prefix: 'fas', intent: 'success'}),
                label(`${counts.passed} in-sync`)
            ]
        }),
        fragment({
            omit: !counts.unchecked,
            items: [
                toolbarSep(),
                Icon.disabled({prefix: 'fas', className: 'xh-text-color-muted'}),
                label(`${counts.unchecked} unchecked`)
            ]
        }),
        toolbarSep(),
        switchInput({
            label: 'w/Comparisons only',
            bind: 'hideUnchecked'
        })
    );
});

const bbar = hoistCmp.factory<ClusterObjectsModel>(({model}) => {
    return toolbar(
        button({
            text: 'Clear All Hibernate Caches',
            icon: Icon.reset(),
            intent: 'warning',
            tooltip: 'Clear the Hibernate caches using the native Hibernate API',
            onClick: () => model.clearAllHibernateCachesAsync()
        })
    );
});
