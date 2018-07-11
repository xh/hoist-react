/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, dialogBody, textArea} from '@xh/hoist/desktop/blueprint';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {pre, table, tbody, td, th, tr, filler} from '@xh/hoist/layout';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {stringifyErrorSafely} from '@xh/hoist/exception';

import {dismissButton} from './ExceptionDialog';

/**
 * Sub-dialog for displaying exception details.  Includes affordances for submitting an
 * error report to the server and copying the stacktrace to the clipboard.
 *
 * @private
 */
@HoistComponent()
export class ExceptionDialogDetails extends Component {

    render() {
        const {model} = this,
            {detailsIsOpen, exception, options} = model,
            {requireReload} = options,
            row = (label, data) => tr(th({item: `${label}:`, style: {textAlign: 'left'}}), td(data));

        if (!detailsIsOpen || !exception) return null;

        this.errorStr = stringifyErrorSafely(exception);
        const header = table(
            tbody(
                row('Name', exception.name),
                row('Message', exception.msg || exception.message || 'N/A'),
                row('App Version', XH.appVersion)
            )
        );

        return dialog({
            title: 'Error Details',
            icon: Icon.search(),
            isOpen: true,
            isCloseButtonShown: !requireReload,
            onClose: !requireReload ? this.onCloseClick : null,
            style: {height: 600, width: 800},
            items: [
                dialogBody({
                    items: [
                        header,
                        pre({
                            style: {
                                border: '1px solid',
                                overflow: 'scroll',
                                height: 230,
                                fontSize: '.75em'
                            },
                            item: this.errorStr
                        }),
                        textArea({
                            style: {
                                height: 125, width: '100%'
                            },
                            placeholder: 'Add message here...',
                            value: model.userMessage,
                            onChange: this.onMessageChange
                        })]
                }),
                toolbar([
                    filler(),
                    button({
                        icon: Icon.envelope(),
                        text: 'Send',
                        disabled: !model.userMessage,
                        onClick: this.onSendClick
                    }),
                    clipboardButton({
                        clipboardSpec: {text: () => this.errorStr},
                        successMessage: 'Error details copied to clipboard.'
                    }),
                    dismissButton({model})
                ])
            ]
        });
    }


    //------------------------
    // Implementation
    //------------------------
    onMessageChange = (evt) => {
        this.model.setUserMessage(evt.target.value);
    }

    onSendClick = () => {
        this.model.sendReport();
    }

    onCloseClick = () => {
        this.model.close();
    }
}
export const exceptionDialogDetails = elemFactory(ExceptionDialogDetails);
