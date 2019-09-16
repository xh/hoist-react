/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {castArray, isEmpty, isFunction} from 'lodash';
import {RestGridModel} from '../RestGridModel';

export const restGridToolbar = hoistCmp.factory({

    model: uses(RestGridModel),

    render({model, extraToolbarItems, ...props}) {
        const {unit, toolbarActions: actions, gridModel} = model;

        let extraItems = extraToolbarItems;
        if (isFunction(extraItems)) extraItems = extraItems();
        extraItems = extraItems ? castArray(extraItems) : [];

        return toolbar(
            recordActionBar({actions, gridModel, selModel: gridModel.selModel}),
            toolbarSep({omit: isEmpty(extraItems)}),
            ...extraItems,
            filler(),
            gridCountLabel({unit}),
            storeFilterField({includeFields: model.filterFields}),
            exportButton()
        );
    }
});