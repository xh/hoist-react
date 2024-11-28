/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, placeholder} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {jsonInput, select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {ClusterConsistencyModel} from './ClusterConsistencyModel';

export const clusterConsistencyPanel = hoistCmp.factory({
    displayName: 'ClusterConsistencyPanel',
    model: creates(ClusterConsistencyModel),

    render({model}) {
        return panel({
            item: hframe(
                panel({
                    item: grid(),
                    bbar: bbar()
                }),
                detailsPanel()
            ),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const detailsPanel = hoistCmp.factory({
    model: uses(ClusterConsistencyModel),
    render({model}) {
        const record = model.gridModel.selectedRecord;
        return panel({
            title: record ? `Stats: ${record.data.displayName}` : 'Stats',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: record
                ? panel({
                      item: jsonInput({
                          readonly: true,
                          width: '100%',
                          height: '100%',
                          showFullscreenButton: false,
                          editorProps: {lineNumbers: false},
                          value: model.fmtStats(record.raw)
                      })
                  })
                : placeholder(Icon.grip(), 'Select an object')
        });
    }
});

const bbar = hoistCmp.factory<ClusterConsistencyModel>({
    render({model}) {
        return toolbar(
            button({
                text: 'Run consistency check',
                icon: Icon.play(),
                intent: 'primary',
                onClick: () => model.runChecks()
            }),
            filler(),
            gridCountLabel({unit: 'objects'}),
            '-',
            select({
                options: [
                    {label: 'By Type', value: 'type'},
                    {label: 'Ungrouped', value: null}
                ],
                width: 125,
                bind: 'groupBy',
                hideDropdownIndicator: true,
                enableFilter: false
            }),
            storeFilterField({matchMode: 'any'}),
            exportButton()
        );
    }
});
