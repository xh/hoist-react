/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {castArray, isEmpty} from 'lodash';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {buttonGroup} from '@xh/hoist/kit/blueprint';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {Icon} from '@xh/hoist/icon';

@HoistComponent
export class RestGridToolbar extends Component {

    render() {
        return toolbar(
            this.renderToolbarItems()
        );
    }

    renderToolbarItems() {
        const {model} = this,
            {store, unit, actionEnabled, actionLocation, selectedRecord} = model,
            extraItemsFn = this.props.extraToolbarItems,
            extraItems = extraItemsFn ? castArray(extraItemsFn()) : [];

        return [
            buttonGroup(
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
                    disabled: !selectedRecord,
                    omit: actionLocation !== 'toolbar' || !actionEnabled.edit
                }),
                button({
                    text: 'Delete',
                    icon: Icon.delete(),
                    intent: 'danger',
                    onClick: this.onDeleteClick,
                    disabled: !selectedRecord,
                    omit: actionLocation !== 'toolbar' || !actionEnabled.del
                })
            ),
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
