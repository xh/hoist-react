/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {textArea, button, dialog, dialogBody, dialogFooter, dialogFooterActions} from 'hoist/kit/blueprint';
import Clipboard from 'clipboard';
import {vbox, spacer, vframe} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {stringifyErrorSafely} from 'hoist/exception';

@observer
export class ErrorDialogDetails extends Component {

    componentDidUpdate() {
        const {detailsVisible} = this.model;

        if (detailsVisible) {
            this.createCopier();
        }
    }

    render() {
        const model = this.model,
            {detailsVisible, exception} = model;

        if (!detailsVisible || !exception) return null;

        this.errorStr = stringifyErrorSafely(exception);

        return dialog({
            title: 'Error Details',
            icon: 'search',
            isOpen: true,
            onClose: this.onCloseClick,
            items: [
                dialogBody(
                    vbox(
                        vframe({
                            padding: 5,
                            style: {border: '1px solid'},
                            item: this.errorStr
                        }),
                        spacer({height: 10}),
                        textArea({
                            rows: 12,
                            placeholder: 'Add message here...',
                            value: model.msg,
                            onChange: this.onMessageChange
                        })
                    )
                ),
                dialogFooter(
                    dialogFooterActions({
                        itemSpec: button,
                        items: [{
                            icon: 'envelope',
                            text: 'Send',
                            onClick: this.onSendClick
                        }, {
                            icon: 'clipboard',
                            cls: 'xh-exception-copy-btn',
                            text: 'Copy'
                        }, {
                            icon: 'cross',
                            text: 'Close',
                            onClick: this.onCloseClick
                        }]
                    })
                )
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}

    onMessageChange = (evt) => {
        this.model.setMsg(evt.target.value);
    }

    onSendClick = () => {
        this.model.sendReport();
    }

    onCloseClick = () => {
        this.model.close();
    }

    createCopier = () => {
        this.clipboard = new Clipboard('.xh-exception-copy-btn', {
            text: () => this.errorStr
        });
        this.clipboard.on('success', (e) => {
            // show toast
            e.clearSelection();
        });
    }
}
export const errorDialogDetails = elemFactory(ErrorDialogDetails);
