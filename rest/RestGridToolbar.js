/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler} from 'hoist/layout';
import {storeCountLabel, storeFilterField, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class RestGridToolbar extends Component {

    render() {
        const model = this.model,
            singleRecord = model.selection.singleRecord,
            actionEnabled = model.actionEnabled;

        return toolbar(
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
            filler(),
            storeCountLabel({store: model.store, unitConfig: model.unitConfig}),
            storeFilterField({store: model.store, fields: model.filterFields}),
            button({icon: Icon.download(), onClick: this.onExportClick})
        );
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

    onExportClick = () => {
        const model = this.model,
            fileName = model.unitConfig.singular;
        model.gridModel.exportDataAsExcel({fileName});
    }
}
export const restGridToolbar = elemFactory(RestGridToolbar);
