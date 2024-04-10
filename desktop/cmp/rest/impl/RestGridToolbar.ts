/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {exportButton, printGridButton} from '@xh/hoist/desktop/cmp/button';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {castArray, isEmpty, isFunction} from 'lodash';
import {RestGridModel} from '../RestGridModel';

/**
 * @internal
 */
export const restGridToolbar = hoistCmp.factory({
    model: uses(RestGridModel, {publishMode: 'limited'}),

    render({model, extraToolbarItems, testId}) {
        const {unit, toolbarActions: actions, gridModel, readonly} = model;

        let extraItems = extraToolbarItems;
        if (isFunction(extraItems)) extraItems = extraItems();
        extraItems = extraItems ? castArray(extraItems) : [];

        return toolbar(
            recordActionBar({
                actions,
                gridModel,
                selModel: gridModel.selModel,
                testId
            }),
            toolbarSep({
                omit: isEmpty(extraItems) || readonly
            }),
            ...extraItems,
            filler(),
            gridCountLabel({
                gridModel,
                unit
            }),
            '-',
            storeFilterField({
                gridModel,
                matchMode: 'any',
                includeFields: model.filterFields
            }),
            exportButton({
                gridModel,
                omit: !model.gridModel.enableExport
            }),
            printGridButton({
                gridModel,
                omit: !model.hasPrintSupport
            })
        );
    }
});
