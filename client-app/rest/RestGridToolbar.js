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
import {button} from 'hoist/kit/semantic';

@observer
export class RestGridToolbar extends Component {

    render() {
        const model = this.props.model,
            singleRecord = model.selection.singleRecord;

        const items = [];
        if (model.enableAdd) {
            items.push(
                this.button({
                    content: 'Add',
                    icon: {name: 'add', color: 'blue'},
                    onClick: this.onAddClick
                })
            );
        }

        if (model.enableEdit) {
            items.push(
                this.button({
                    content: 'Edit',
                    icon: {name: 'edit', color: 'blue'},
                    onClick: this.onEditClick,
                    disabled: !singleRecord
                })
            );
        }

        if (model.enableDelete) {
            items.push(
                this.button({
                    content: 'Delete',
                    icon: {name: 'x', color: 'red'},
                    onClick: this.onDeleteClick,
                    disabled: !singleRecord
                })
            );
        }

        return hbox({
            cls: 'rest-toolbar',
            style: {background: '#106ba3'},
            items
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    onAddClick = () => {
        const model = this.props.model;
        model.openAddForm();
    }

    onDeleteClick = () => {
        const model = this.props.model;
        model.deleteRecord(model.selection.singleRecord);
    }

    onEditClick = () => {
        const model = this.props.model;
        model.openEditForm(model.selection.singleRecord);
    }

    button(props) {
        return button({
            compact: true,
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
