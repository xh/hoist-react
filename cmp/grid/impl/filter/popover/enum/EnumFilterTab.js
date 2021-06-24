/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {Icon} from '@xh/hoist/icon';

import {EnumFilterTabModel} from './EnumFilterTabModel';

export const enumFilterTab = hoistCmp.factory({
    model: uses(EnumFilterTabModel),
    render() {
        return panel({
            tbar: tbar(),
            item: grid()
        });
    }
});

const tbar = hoistCmp.factory({
    render() {
        return toolbar({
            compact: true,
            item: storeFilterField({
                bind: 'filterText',
                leftIcon: Icon.search(),
                placeholder: 'Search...',
                flex: 1
            })
        });
    }
});