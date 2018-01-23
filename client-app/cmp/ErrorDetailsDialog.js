/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {div} from 'hoist/layout';

import {button, dialog } from 'hoist/blueprint';
import {action, observer} from 'hoist/mobx';

@observer
export class ErrorDetailsDialog extends Component {

    render() {
        if (!this.props.visManager.isVisible) return null;

        return dialog({
            isOpen: true,
            onClose: this.onClose,
            title: 'Error Details',
            iconName: 'search',
            items: [
                div({
                    cls: 'pt-dialog-body'
                    // items: options.message
                }),
                div({
                    cls: 'pt-dialog-footer',
                    style: {textAlign: 'right'},
                    items: [
                        button({
                            text: 'Send',
                            rightIconName: 'envelope',
                            onClick: this.onSend
                        }),
                        button({
                            text: 'Copy',
                            rightIconName: 'clipboard',
                            onClick: this.onCopy
                        }),
                        button({
                            text: 'Close',
                            rightIconName: 'cross',
                            intent: 'Intent.PRIMARY',
                            onClick: this.onClose
                        })
                    ]
                })
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    onSend = () => {

    }

    onCopy = () => {

    }

    @action
    onClose = () => {
        this.props.visManager.isVisible = false;
    }
}