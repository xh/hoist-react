/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {dialog} from '@xh/hoist/desktop/cmp/dialog';
import {XH, hoistCmp, uses} from '@xh/hoist/core';
import {filler, fragment} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';

import {ExceptionDialogModel} from '@xh/hoist/appcontainer/ExceptionDialogModel';

import {exceptionDialogDetails} from './ExceptionDialogDetails';
import './ExceptionDialog.scss';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force the reload of the application (in the case of a fatal exception).
 *
 * @private
 */
export const exceptionDialog = hoistCmp.factory({
    displayName: 'Exception Dialog',
    model: uses(ExceptionDialogModel),

    render({model}) {
        const {exception, options} = model;

        if (!exception) return null;

        const onClose = !options.requireReload ? () => model.close() : null;

        return fragment(
            dialog({
                model: {
                    showCloseButton: !options.requireReload,
                    size: {width: 500},
                    onClose
                },
                title: options.title,
                icon: Icon.warning({size: 'lg'}),
                items: panel({
                    item: options.message,
                    bbar: bbar()
                })
            }),
            exceptionDialogDetails()
        );
    }
});

//--------------------------------
// Implementation
//--------------------------------
const bbar = hoistCmp.factory(
    ({model}) => toolbar(
        filler(),
        button({
            icon: Icon.search(),
            text: 'Show/Report Details',
            onClick: () => model.openDetails(),
            omit: !model.options.showAsError
        }),
        dismissButton()
    )
);


/**
 * A Dismiss button that either forces reload, or allows close.
 * @private
 */
export const dismissButton = hoistCmp.factory(
    ({model}) => {
        const reloadRequired = model.options.requireReload,
            loginRequired = isSessionExpired(model.exception);
        return reloadRequired ?
            button({
                icon: loginRequired ? Icon.login() : Icon.refresh(),
                text: loginRequired ? 'Login' : 'Reload App',
                autoFocus: true,
                onClick: () => XH.reloadApp()
            }) :
            button({
                text: 'Close',
                autoFocus: true,
                onClick: () => model.close()
            });
    }
);

function isSessionExpired(e) {
    return e && e.httpStatus === 401;
}
