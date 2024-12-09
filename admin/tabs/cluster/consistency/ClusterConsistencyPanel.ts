/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {jsonInput, select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {ClusterConsistencyModel} from './ClusterConsistencyModel';
import './ClusterConsistency.scss';

export const clusterConsistencyPanel = hoistCmp.factory({
    displayName: 'ClusterConsistencyPanel',
    model: creates(ClusterConsistencyModel),

    render({model}) {
        return panel({
            item: hframe(
                panel({
                    item: grid({model: model.gridModel}),
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
        const {selectedRecordName, detailGridModel, instanceName, selectedAdminStats} = model;
        return panel({
            title: selectedRecordName ? `Check: ${selectedRecordName}` : 'Check',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: selectedRecordName
                ? vframe(
                      grid({model: detailGridModel, flex: 1}),
                      panel({
                          title: instanceName ? `Stats: ${instanceName}` : 'Stats',
                          omit: !selectedAdminStats,
                          compactHeader: true,
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
                  )
                : placeholder(Icon.grip(), 'Select an object')
        });
    }
});

const bbar = hoistCmp.factory<ClusterConsistencyModel>({
    render() {
        return toolbar(
            filler(),
            gridCountLabel({unit: 'objects'}),
            '-',
            select({
                options: [
                    {label: 'By Owner', value: 'owner'},
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
