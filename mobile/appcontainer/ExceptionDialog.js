/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp, uses} from '@xh/hoist/core';
import {filler, fragment} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './ExceptionDialog.scss';
import {exceptionDialogDetails} from './ExceptionDialogDetails';
import {ExceptionDialogModel} from '@xh/hoist/appcontainer/ExceptionDialogModel';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force the reload of the application (in the case of a fatal exception).
 *
 * @private
 */
export const exceptionDialog = hoistCmp.factory({
    displayName: 'ExceptionDialog',
    model: uses(ExceptionDialogModel),

    render({model}) {
        const {exception, options} = model;

        if (!exception) return null;

        return fragment(
            dialog({
                isOpen: true,
                title: options.title,
                className: 'xh-exception-dialog',
                icon: Icon.warning(),
                content: options.message,
                onCancel: !options.requireReload ? () => model.close() : null,
                buttons: [
                    button({
                        icon: Icon.search(),
                        text: 'Show/Report Details',
                        onClick: () => model.openDetails(),
                        omit: !options.showAsError
                    }),
                    filler(),
                    dismissButton({model})
                ]
            }),
            exceptionDialogDetails({model})
        );
    }
});

/**
 * A Dismiss button that either forces reload, or allows close.
 * @private
 */
export const dismissButton = hoistCmp.factory(
    ({model}) => {
        return model.options.requireReload ?
            button({
                icon: Icon.refresh(),
                text: sessionExpired(model.exception) ? 'Login' : 'Reload App',
                onClick: () => XH.reloadApp()
            }) :
            button({
                text: 'Close',
                onClick: () => model.close()
            });
    }
);

function sessionExpired(e) {
    return e && e.httpStatus === 401;
}

