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
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {DistributedObjectsModel} from './DistributedObjectsModel';
import './DistributedObjects.scss';

export const distributedObjectsPanel = hoistCmp.factory({
    displayName: 'DistributedObjectsPanel',
    model: creates(DistributedObjectsModel),

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
    model: uses(DistributedObjectsModel),
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
            storeFilterField({matchMode: 'any'}),
            exportButton()
        );
    }
});
