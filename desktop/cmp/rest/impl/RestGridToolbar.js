/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {castArray, isEmpty} from 'lodash';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
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
            {unit, toolbarActions: actions, gridModel} = model,
            extraItemsFn = this.props.extraToolbarItems,
            extraItems = extraItemsFn ? castArray(extraItemsFn()) : [];

        return [
            recordActionBar({actions, gridModel, selModel: gridModel.selModel}),
            toolbarSep({omit: isEmpty(extraItems)}),
            ...extraItems,
            filler(),
            storeCountLabel({gridModel, unit}),
            storeFilterField({gridModel, includeFields: model.filterFields}),
            exportButton({model, exportOptions: {type: 'excelTable'}})
        ];
    }
}

export const restGridToolbar = elemFactory(RestGridToolbar);
