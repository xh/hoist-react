/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, creates} from '@xh/hoist/core';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';
import {ServiceModel} from './ServiceModel';

export const ServicePanel = hoistCmp({
    model: creates(ServiceModel),

    render({model}) {
        return panel({
            mask: model.loadModel,
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