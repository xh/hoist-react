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
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';

import {UserModel} from './UserModel';

export const UserPanel = hoistCmp({
    model: creates(UserModel),

    render() {
        return panel({
            mask: 'onLoad',
            tbar: [
                switchInput({
                    bind: 'activeOnly',
                    label: 'Active only'
                }),
                toolbarSep(),
                switchInput({
                    bind: 'withRolesOnly',
                    label: 'With roles only'
                }),
                filler(),
                gridCountLabel({unit: 'user'}),
                storeFilterField(),
                exportButton()
            ],
            item: grid()
        });
    }
});
