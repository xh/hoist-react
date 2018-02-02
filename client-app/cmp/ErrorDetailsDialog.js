/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button, buttonContent, card, form, header, icon, modal, modalActions, modalContent, textArea} from 'hoist/kit/semantic';

import {stringifyErrorSafely} from 'hoist/utils/ErrorUtils';
import {action, observer} from 'hoist/mobx';

@observer
export class ErrorDetailsDialog extends Component {

    render() {
        if (!this.props.visManager.isVisible) return null;
        return modal({
            open: true,
            onClose: this.onClose,
            items: [
                header({
                    icon: 'search',
                    content: 'Error Details'
                }),
                modalContent({
                    items: [
                        card({
                            fluid: true,
                            description: stringifyErrorSafely(this.props.e)
                        }),
                        form({
                            items: textArea({
                                autoHeight: true,
                                rows: 3,
                                placeholder: 'Add message here...'
                            })
                        })
                    ]
                }),
                modalActions({
                    style: {textAlign: 'right'},
                    items: [
                        button({
                            cls: 'icon',
                            labelPosition: 'left',
                            items: [
                                icon({name: 'envelope'}),
                                buttonContent({content: 'Send'})
                            ],
                            onClick: this.onSend
                        }),
                        button({
                            cls: 'icon',
                            labelPosition: 'left',
                            items: [
                                icon({name: 'clipboard'}),
                                buttonContent({content: 'Copy'})
                            ],
                            onClick: this.onCopy
                        }),
                        button({
                            cls: 'icon',
                            labelPosition: 'left',
                            items: [
                                icon({name: 'close'}),
                                buttonContent({content: 'Close'})
                            ],
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