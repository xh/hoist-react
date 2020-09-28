/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {FocusStyleManager} from '@blueprintjs/core';

import {ExceptionDialogModel} from '@xh/hoist/appcontainer/ExceptionDialogModel';
import {filler, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import './ExceptionDialog.scss';
import {exceptionDialogDetails} from './ExceptionDialogDetails';

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

        if (!exception) {
            FocusStyleManager.onlyShowFocusOnTabs();
            return null;
        }

        FocusStyleManager.alwaysShowFocus();

        const onClose = !options.requireReload ? () => model.close() : null;

        return fragment(
            dialog({
                isOpen: true,
                title: options.title,
                isCloseButtonShown: !options.requireReload,
                onClose,
                icon: Icon.warning({size: 'lg'}),
                items: [
                    dialogBody(options.message),
                    bbar()
                ]
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
        button({
            omit: !XH.identityService?.isImpersonating,
            icon: Icon.impersonate(),
            text: 'End Impersonation',
            onClick: () => XH.identityService.endImpersonateAsync()
        }),
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
                elementRef: (el) => model.dismissButtonRef = el,
                onClick: () => XH.reloadApp()
            }) :
            button({
                text: 'Close',
                elementRef: (el) => model.dismissButtonRef = el,
                onClick: () => model.close()
            });
    }
);

function isSessionExpired(e) {
    return e && e.httpStatus === 401;
}
