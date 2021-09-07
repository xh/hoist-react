/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {castArray, isEmpty, isFunction} from 'lodash';
import {RestGridModel} from '../RestGridModel';

export const restGridToolbar = hoistCmp.factory({
    model: uses(RestGridModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model, extraToolbarItems}) {
        const {unit, toolbarActions: actions, gridModel} = model;

        let extraItems = extraToolbarItems;
        if (isFunction(extraItems)) extraItems = extraItems();
        extraItems = extraItems ? castArray(extraItems) : [];

        return toolbar(
            recordActionBar({
                actions,
                gridModel,
                selModel: gridModel.selModel
            }),
            toolbarSep({
                omit: isEmpty(extraItems)
            }),
            ...extraItems,
            filler(),
            gridCountLabel({
                gridModel,
                unit
            }),
            storeFilterField({
                gridModel,
                matchMode: 'any',
                includeFields: model.filterFields
            }),
            exportButton({
                gridModel,
                omit: !model.gridModel.enableExport
            })
        );
    }
});
