/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory} from 'hoist';
import {observer} from 'hoist/mobx';
import {hbox} from 'hoist/layout';
import {button} from 'hoist/kit/semantic';


@observer
export class RestGridToolbar extends Component {

    render() {
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
                    color: 'white',
                    icon: {name: 'add', color: 'blue'},
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    onClick: this.props.addRecord
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
                    onClick: this.deleteRecord,
                    disabled: !this.props.selectionState.firstRow
                })
            ]
        });
    }

    deleteRecord = () => {
        const selection = this.props.selectionState.firstRow,
            method = 'DELETE';
        return XH.fetchJson({
            url: `${this.props.url}/${selection.id}`,
            method: method
        }).then(resp => {
            this.props.updateRows(selection, method);
        }).catch((e) => {
            console.log(e);
        });
    }

}

export const toolbar = elemFactory(RestGridToolbar);