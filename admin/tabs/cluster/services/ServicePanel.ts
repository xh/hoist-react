/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {detailsPanel} from '@xh/hoist/admin/tabs/cluster/services/DetailsPanel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {ServiceModel} from './ServiceModel';

export const servicePanel = hoistCmp.factory({
    model: creates(ServiceModel),

    render() {
        return panel({
            mask: 'onLoad',
            tbar: [
                span({
                    item: 'Hoist + Application Services',
                    className: 'xh-bold'
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
            )
        });
    }
});
