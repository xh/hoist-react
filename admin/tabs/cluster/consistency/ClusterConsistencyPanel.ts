/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, placeholder, table, td, th, tr} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
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
        const record = model.gridModel.selectedRecord,
            checks = record?.data.checks,
            fieldNames = (checks ? Object.keys(checks) : null) as string[],
            instanceNames = model.parent.gridModel.store.records.map(r => r.data.name) as string[];
        console.log(fieldNames, instanceNames);
        return panel({
            title: record ? `Check: ${record.data.name}` : 'Check',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: checks
                ? panel({
                      // TODO: Use gridModel here
                      item: table(
                          tr(th('instance'), ...fieldNames.map(fieldName => th(fieldName))),
                          ...instanceNames.map(instanceName =>
                              tr(
                                  td(instanceName),
                                  ...fieldNames.map(fieldName =>
                                      td(checks[fieldName]?.[instanceName])
                                  )
                              )
                          )
                      )
                  })
                : placeholder(Icon.grip(), 'Select an object')
        });
    }
});

const bbar = hoistCmp.factory<ClusterConsistencyModel>({
    render({model}) {
        return toolbar(
            filler(),
            gridCountLabel({unit: 'objects'}),
            '-',
            select({
                options: [
                    {label: 'By Owner', value: 'owner'},
                    {label: 'By Type', value: 'type'},
                    {label: 'By Inconsistency', value: 'inconsistencyState'},
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
