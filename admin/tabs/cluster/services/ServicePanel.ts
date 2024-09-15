/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {detailsPanel} from '@xh/hoist/admin/tabs/cluster/services/DetailsPanel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {ServiceModel} from './ServiceModel';

export const servicePanel = hoistCmp.factory({
    model: creates(ServiceModel),

    render({model}) {
        return panel({
            bbar: [
                recordActionBar({
                    selModel: model.gridModel.selModel,
                    actions: [model.clearCachesAction, model.clearClusterCachesAction]
                }),
                filler(),
                gridCountLabel({unit: 'service'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: hframe(
                grid({
                    flex: 1,
                    agOptions: {
                        groupRowRendererParams: {
                            innerRenderer: params => params.value + ' Services'
                        }
                    }
                }),
                detailsPanel()
            ),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});
