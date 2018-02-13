/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory} from 'hoist';
import {observer} from 'hoist/mobx';
import {hbox} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';

@observer
export class RestGridToolbar extends Component {

    render() {
        const model = this.model,
            restFormModel = this.restFormModel,
            singleRecord = model.selection.singleRecord;

        return hbox({
            style: {background: '#106ba3'},
            itemSpec: {
                factory: button,
                style: {margin: '4px 0px 4px 4px'}
            },
            items: [
                {
                    text: 'Add',
                    iconName: 'add',
                    onClick: this.onAddClick,
                    omit: !restFormModel.enableAdd
                },
                {
                    text: 'Edit',
                    iconName: 'edit',
                    onClick: this.onEditClick,
                    disabled: !singleRecord,
                    omit: !restFormModel.enableEdit
                },
                {
                    text: 'Delete',
                    iconName: 'delete',
                    onClick: this.onDeleteClick,
                    disabled: !singleRecord,
                    omit: !restFormModel.enableDelete
                }
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    get model() {return this.props.model}
    get restFormModel() {return this.props.model.restFormModel}

    onAddClick = () => {
        this.restFormModel.openAddForm();
    }

    onDeleteClick = () => {
        const {confirmModel} = this.model,
            model = this.model;
        confirmModel.show({
            message: 'Are you sure you want to delete this record?',
            onConfirm: () => model.deleteRecord(model.selection.singleRecord)
        });
    }

    onEditClick = () => {
        const restFormModel = this.restFormModel;
        restFormModel.openEditForm(this.model.selection.singleRecord);
    }
}
export const restGridToolbar = elemFactory(RestGridToolbar);
