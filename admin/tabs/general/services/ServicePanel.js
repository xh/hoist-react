/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {ServiceModel} from './ServiceModel';

export const ServicePanel = hoistCmp({
    model: creates(ServiceModel),

    render({model}) {
        return panel({
            mask: 'onLoad',
            tbar: [
                button({
                    icon: Icon.reset(),
                    text: 'Clear Selected',
                    intent: 'danger',
                    onClick: () => model.clearCaches(),
                    disabled: model.gridModel.selModel.isEmpty
                }),
                filler(),
                gridCountLabel({unit: 'service'}),
                storeFilterField(),
                exportButton()
            ],
            item: grid({
                hideHeaders: true,
                agOptions: {
                    groupRowInnerRenderer: (params) => params.value + ' Services'
                }
            })
        });
    }
});
