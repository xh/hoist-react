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
import {fmtDate} from 'hoist/format';

@hoistComponent()
export class RestGridToolbar extends Component {

    render() {
        const model = this.model,
            singleRecord = model.selection.singleRecord,
            actionEnabled = model.actionEnabled;

        return toolbar({
            itemSpec: {
                factory: button
            },
            items: [
                {
                    text: 'Add',
                    icon: Icon.add(),
                    intent: 'success',
                    onClick: this.onAddClick,
                    omit: !actionEnabled.add
                },
                {
                    text: 'Edit',
                    icon: Icon.edit(),
                    onClick: this.onEditClick,
                    disabled: !singleRecord,
                    omit: !actionEnabled.edit
                },
                {
                    text: 'Delete',
                    icon: Icon.delete(),
                    intent: 'danger',
                    onClick: this.onDeleteClick,
                    disabled: !singleRecord,
                    omit: !actionEnabled.del
                },
                filler(),
                storeCountLabel({store: model.store, unitConfig: model.unitConfig}),
                storeFilterField({store: model.store, fields: model.filterFields}),
                button({icon: Icon.download(), onClick: this.onExportClick})
            ]
        });
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
            fileName = `${model.unitConfig.plural}: ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`; // can I count on dates? Probably not.
        model.gridModel.exportDataAsExcel({fileName});
    }
}
export const restGridToolbar = elemFactory(RestGridToolbar);
