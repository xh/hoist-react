/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistComponent, useLocalModel} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';
import {ServiceModel} from './ServiceModel';

export const [ServicePanel] = hoistComponent(() => {
    const model = useLocalModel(ServiceModel),
        {gridModel} = model;

    return panel({
        mask: model.loadModel,
        tbar: toolbar(
            button({
                icon: Icon.sync(),
                text: 'Clear Caches',
                onClick: () => model.clearCaches(),
                disabled: gridModel.selModel.isEmpty
            }),
            filler(),
            storeCountLabel({gridModel, unit: 'service'}),
            storeFilterField({gridModel}),
            exportButton({gridModel})
        ),
        item: grid({
            model: gridModel,
            hideHeaders: true,
            agOptions: {
                groupRowInnerRenderer: (params) => params.value + ' Services'
            }
        })
    });
});