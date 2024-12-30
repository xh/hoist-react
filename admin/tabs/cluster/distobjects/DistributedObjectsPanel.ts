/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, placeholder} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {jsonInput, select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {Icon} from '@xh/hoist/icon';
import {DistributedObjectsModel} from './DistributedObjectsModel';

export const distributedObjectsPanel = hoistCmp.factory({
    displayName: 'DistributedObjectsPanel',
    model: creates(DistributedObjectsModel),

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
    model: uses(DistributedObjectsModel),
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

const bbar = hoistCmp.factory<DistributedObjectsModel>({
    render({model}) {
        return toolbar(
            recordActionBar({
                selModel: model.gridModel.selModel,
                actions: [model.clearAction]
            }),
            '-',
            button({
                text: 'Clear Hibernate Caches',
                icon: Icon.reset(),
                intent: 'warning',
                tooltip: 'Clear the Hibernate caches using the native Hibernate API',
                onClick: () => model.clearHibernateCachesAsync()
            }),
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
