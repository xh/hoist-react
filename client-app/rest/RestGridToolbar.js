/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {hbox} from 'hoist/layout';
import {button} from 'hoist/kit/semantic';

@observer
export class RestGridToolbar extends Component {

    render() {
        const selModel = this.props.selectionModel,
            restModel = this.props.restModel;
        return hbox({
            cls: 'rest-toolbar',
            style: {
                background: '#106ba3'
            },
            items: [
                button({
                    content: 'Add',
                    size: 'small',
                    compact: true,
                    icon: {name: 'add', color: 'blue'},
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    onClick: restModel.addRecord
                }),
                button({
                    content: 'Delete',
                    size: 'small',
                    compact: true,
                    icon: {name: 'x', color: 'red'},
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    onClick: () => restModel.deleteRecord(selModel.firstRow),
                    disabled: !selModel.firstRow
                })
            ]
        });
    }
}
