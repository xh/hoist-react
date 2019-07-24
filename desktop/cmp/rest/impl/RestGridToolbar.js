/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {castArray, isEmpty, isFunction} from 'lodash';
import {Component} from 'react';
import {RestGridModel} from '../RestGridModel';

@HoistComponent
export class RestGridToolbar extends Component {

    static modelClass = RestGridModel;

    render() {
        return toolbar(
            this.renderToolbarItems()
        );
    }

    renderToolbarItems() {
        const {model} = this,
            {unit, toolbarActions: actions, gridModel} = model;

        let extraItems = this.props.extraToolbarItems;
        if (isFunction(extraItems)) extraItems = extraItems();
        extraItems = extraItems ? castArray(extraItems) : [];

        return [
            recordActionBar({actions, gridModel, selModel: gridModel.selModel}),
            toolbarSep({omit: isEmpty(extraItems)}),
            ...extraItems,
            filler(),
            gridCountLabel({gridModel, unit}),
            storeFilterField({gridModel, includeFields: model.filterFields}),
            exportButton({gridModel})
        ];
    }
}

export const restGridToolbar = elemFactory(RestGridToolbar);
