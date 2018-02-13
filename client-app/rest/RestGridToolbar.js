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
                    icon: 'add',
                    onClick: this.onAddClick,
                    omit: !model.enableAdd
                },
                {
                    text: 'Edit',
                    icon: 'edit',
                    onClick: this.onEditClick,
                    disabled: !singleRecord,
                    omit: !model.enableEdit
                },
                {
                    text: 'Delete',
                    icon: 'delete',
                    onClick: this.onDeleteClick,
                    disabled: !singleRecord,
                    omit: !model.enableDelete
                }
            ]
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    get model() {return this.props.model}

    onAddClick = () => {
        this.model.openAddForm();
    }

    onDeleteClick = () => {
        const model = this.model;
        model.deleteRecord(model.selection.singleRecord);
    }

    onEditClick = () => {
        const model = this.model;
        model.openEditForm(model.selection.singleRecord);
    }
}
export const restGridToolbar = elemFactory(RestGridToolbar);
