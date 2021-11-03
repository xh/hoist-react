/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {ServiceModel} from './ServiceModel';

export const servicePanel = hoistCmp.factory({
    model: creates(ServiceModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            tbar: [
                Icon.info(),
                span({
                    item: 'Service classes for server-side Hoist and application-level business logic',
                    className: 'xh-bold'
                }),
                filler(),
                button({
                    icon: Icon.reset(),
                    text: 'Clear Selected',
                    intent: 'danger',
                    onClick: () => model.clearCachesAsync(),
                    disabled: model.gridModel.selModel.isEmpty
                }),
                '-',
                gridCountLabel({unit: 'service'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: grid({
                agOptions: {
                    groupRowRendererParams: {
                        innerRenderer: (params) => params.value + ' Services'
                    }
                }
            })
        });
    }
});
