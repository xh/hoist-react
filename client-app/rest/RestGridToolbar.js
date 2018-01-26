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
import {button} from 'hoist/kit/blueprint';


@observer
export class RestGridToolbar extends Component {

    render() {
        return hbox({
            style: {
                background: 'lightgray'
            },
            items: [
                button({
                    text: 'Add',
                    iconName: 'add',
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    onClick: this.props.addRec
                }),
                button({
                    text: 'Delete',
                    iconName: 'cross',
                    style: {
                        marginTop: 5,
                        marginBottom: 5,
                        marginLeft: 5
                    },
                    disabled: !this.props.selectionState.firstRow,
                    onClick: this.deleteRec
                })
            ]
        });
    }

    deleteRec = () => {
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