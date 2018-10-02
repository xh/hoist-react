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
import {recordActionBar} from '../record/RecordActionBar';

@HoistComponent
export class RestGridToolbar extends Component {

    render() {
        return toolbar(
            this.renderToolbarItems()
        );
    }

    renderToolbarItems() {
        const {model} = this,
            {store, unit, toolbarActions, selModel} = model,
            extraItemsFn = this.props.extraToolbarItems,
            extraItems = extraItemsFn ? castArray(extraItemsFn()) : [];

        return [
            recordActionBar({
                actions: toolbarActions,
                context: model.actionContext,
                group: true,
                selModel
            }),
            toolbarSep({omit: isEmpty(extraItems)}),
            ...extraItems,
            filler(),
            storeCountLabel({store, unit}),
            storeFilterField({store, fields: model.filterFields}),
            exportButton({model})
        ];
    }
}

export const restGridToolbar = elemFactory(RestGridToolbar);
