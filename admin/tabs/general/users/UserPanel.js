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
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {exportButton} from '@xh/hoist/desktop/cmp/button';

import {UserModel} from './UserModel';

export const [UserPanel] = hoistComponent(() => {
    const model = useLocalModel(UserModel),
        {gridModel} = model;
    return panel({
        mask: model.loadModel,
        tbar: toolbar(
            switchInput({
                model,
                bind: 'activeOnly',
                label: 'Active only'
            }),
            toolbarSep(),
            switchInput({
                model,
                bind: 'withRolesOnly',
                label: 'With roles only'
            }),
            filler(),
            storeCountLabel({gridModel, unit: 'user'}),
            storeFilterField({gridModel}),
            exportButton({gridModel})
        ),
        item: grid({model: gridModel})
    });
});
