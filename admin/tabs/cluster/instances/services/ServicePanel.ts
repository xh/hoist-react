/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {detailsPanel} from '@xh/hoist/admin/tabs/cluster/instances/services/DetailsPanel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, uses} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {ServiceModel} from './ServiceModel';

export const servicePanel = hoistCmp.factory({
    model: creates(ServiceModel),

    render({model}) {
        return panel({
            item: hframe(
                panel({
                    item: grid({
                        flex: 1,
                        agOptions: {
                            groupRowRendererParams: {
                                innerRenderer: params => params.value + ' Services'
                            }
                        }
                    }),
                    bbar: bbar()
                }),
                detailsPanel()
            ),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const bbar = hoistCmp.factory({
    model: uses(ServiceModel),
    render({model}) {
        return toolbar(
            recordActionBar({
                selModel: model.gridModel.selModel,
                actions: [model.clearCachesAction, model.clearClusterCachesAction]
            }),
            filler(),
            gridCountLabel({unit: 'service'}),
            '-',
            buttonGroupInput({
                bind: 'typeFilter',
                outlined: true,
                items: [
                    button({value: 'all', text: 'All'}),
                    button({value: 'app', text: 'App'}),
                    button({value: 'hoist', text: 'Hoist'})
                ]
            }),
            storeFilterField({
                matchMode: 'any',
                autoApply: false,
                onFilterChange: f => (model.textFilter = f)
            }),
            exportButton()
        );
    }
});
