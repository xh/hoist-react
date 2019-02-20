/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {pre, table, tbody, td, th, tr, filler} from '@xh/hoist/cmp/layout';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {stringifyErrorSafely} from '@xh/hoist/exception';

import {dismissButton} from './ExceptionDialog';

/**
 * Sub-dialog for displaying exception details.  Includes affordances for submitting an
 * error report to the server and copying the stacktrace to the clipboard.
 *
 * @private
 */
@HoistComponent
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

        // In the case of a pre-auth failure, the client will not know the user. If that's the case,
        // don't display a message prompt and send button - we will not be able to submit.
        const clientUserKnown = !!XH.getUsername();

        return dialog({
            title: 'Error Details',
            icon: Icon.search(),
            isOpen: true,
            isCloseButtonShown: !requireReload,
            onClose: !requireReload ? this.onCloseClick : null,
            style: {height: 600, width: 800},
            items: [
                dialogBody({
                    className: 'xh-exception-dialog-details',
                    items: [
                        header,
                        pre(this.errorStr),
                        textArea({
                            model,
                            bind: 'userMessage',
                            commitOnChange: true,
                            placeholder: 'Add message here...',
                            width: '100%',
                            height: 120,
                            omit: !clientUserKnown
                        })]
                }),
                toolbar([
                    filler(),
                    button({
                        icon: Icon.envelope(),
                        text: 'Send',
                        disabled: !model.userMessage,
                        onClick: this.onSendClick,
                        omit: !clientUserKnown
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
    onSendClick = () => {
        this.model.sendReportAsync();
    };

    onCloseClick = () => {
        this.model.close();
    };
}
export const exceptionDialogDetails = elemFactory(ExceptionDialogDetails);
