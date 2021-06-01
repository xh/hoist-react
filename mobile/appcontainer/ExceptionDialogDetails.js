/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ExceptionDialogModel} from '@xh/hoist/appcontainer/ExceptionDialogModel';
import {filler, fragment, pre, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {stringifyErrorSafely} from '@xh/hoist/exception';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {textArea} from '@xh/hoist/mobile/cmp/input';
import {dismissButton} from './ExceptionDialog';

/**
 * Sub-dialog for displaying exception details.  Includes affordances for submitting an
 * error report to the server.
 *
 * @private
 */
export const exceptionDialogDetails = hoistCmp.factory({
    model: uses(ExceptionDialogModel),

    render({model}) {
        const {detailsIsOpen, exception, options} = model,
            {requireReload} = options,
            row = (label, data) => tr(th({item: `${label}:`, style: {textAlign: 'left'}}), td(data));

        if (!detailsIsOpen || !exception) return null;

        const errorStr = stringifyErrorSafely(exception);
        const header = table(
            tbody(
                row('Name', exception.name),
                row('Message', exception.msg || exception.message || 'N/A'),
                row('App Version', XH.appVersion)
            )
        );

        return dialog({
            title: 'Error Details',
            className: 'xh-exception-dialog-details',
            icon: Icon.search(),
            isOpen: true,
            isCloseButtonShown: !requireReload,
            onCancel: !requireReload ? () => model.close() : null,
            content: fragment(
                header,
                pre(errorStr),
                textArea({
                    placeholder: 'Add message here...',
                    bind: 'userMessage'
                })
            ),
            buttons: [
                button({
                    icon: Icon.envelope(),
                    text: 'Send',
                    disabled: !model.userMessage,
                    onClick: () => model.sendReportAsync()
                }),
                filler(),
                dismissButton()
            ]
        });
    }
});
