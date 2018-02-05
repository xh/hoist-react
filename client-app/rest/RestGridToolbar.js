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
import {hoistButton} from 'hoist/kit/semantic';

@observer
export class RestGridToolbar extends Component {

    render() {
        const model = this.model,
            singleRecord = model.selection.singleRecord;

        const items = [
            this.button({
                content: 'Add',
                icon: {name: 'add', color: 'blue'},
                onClick: this.onAddClick,
                omit: !model.enableAdd
            }),
            this.button({
                content: 'Edit',
                icon: {name: 'edit', color: 'blue'},
                onClick: this.onEditClick,
                disabled: !singleRecord,
                omit: !model.enableEdit
            }),
            this.button({
                content: 'Delete',
                icon: {name: 'x', color: 'red'},
                onClick: this.onDeleteClick,
                disabled: !singleRecord,
                omit: !model.enableDelete
            })
        ];

        return hbox({
            cls: 'rest-toolbar',
            style: {background: '#106ba3'},
            items
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

    button(props) {
        return hoistButton({
            style: {
                marginTop: 5,
                marginBottom: 5,
                marginLeft: 5
            },
            ...props
        });
    }
}
export const restGridToolbar = elemFactory(RestGridToolbar);
