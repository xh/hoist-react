/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {castArray, isEmpty} from 'lodash';
import {button} from 'hoist/kit/blueprint';
import {HoistComponent, elemFactory} from 'hoist/core';
import {filler} from 'hoist/layout';
import {exportButton, storeCountLabel, storeFilterField, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@HoistComponent()
export class RestGridToolbar extends Component {

    render() {
        return toolbar(
            this.renderToolbarItems()
        );
    }

    renderToolbarItems() {
        const {model} = this,
            {store, unit, actionEnabled} = model,
            {singleRecord} = model.selection,
            extraItemsFn = this.props.extraToolbarItems,
            extraItems = extraItemsFn ? castArray(extraItemsFn()) : [];

        return [
            button({
                text: 'Add',
                icon: Icon.add(),
                intent: 'success',
                onClick: this.onAddClick,
                omit: !actionEnabled.add
            }),
            button({
                text: 'Edit',
                icon: Icon.edit(),
                intent: 'primary',
                onClick: this.onEditClick,
                disabled: !singleRecord,
                omit: !actionEnabled.edit
            }),
            button({
                text: 'Delete',
                icon: Icon.delete(),
                intent: 'danger',
                onClick: this.onDeleteClick,
                disabled: !singleRecord,
                omit: !actionEnabled.del
            }),
            toolbarSep({omit: isEmpty(extraItems)}),
            ...extraItems,
            filler(),
            storeCountLabel({store, unit}),
            storeFilterField({store, fields: model.filterFields}),
            exportButton({model})
        ];
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    onAddClick = () => {
        this.model.addRecord();
    }

    onEditClick = () => {
        this.model.editSelection();
    }

    onDeleteClick = () => {
        this.model.confirmDeleteSelection();
    }
}
export const restGridToolbar = elemFactory(RestGridToolbar);
