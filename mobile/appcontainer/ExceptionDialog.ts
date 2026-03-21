/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ExceptionDialogModel} from '@xh/hoist/appcontainer/ExceptionDialogModel';
import {div, filler, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import './ExceptionDialog.scss';
import {exceptionDialogDetails} from './ExceptionDialogDetails';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force reload of the application (in the case of a fatal exception).
 * @internal
 */
export const exceptionDialog = hoistCmp.factory({
    displayName: 'ExceptionDialog',
    model: uses(ExceptionDialogModel),

    render({model}) {
        const {exception, options} = model,
            {identityService} = XH;

        if (!exception) return null;

        return fragment(
            dialog({
                isOpen: true,
                title: options.title,
                className: 'xh-exception-dialog',
                icon: Icon.warning(),
                content: fragment(
                    options.message,
                    div({
                        omit: !exception.traceId,
                        className: 'xh-exception-dialog__trace-id',
                        item: `Trace ID: ${exception.traceId}`
                    })
                ),
                onCancel: !options.requireReload ? () => model.close() : null,
                buttons: [
                    button({
                        icon: Icon.search(),
                        text: 'Details',
                        onClick: () => model.openDetails(),
                        omit: !options.showAsError
                    }),
                    button({
                        omit: !identityService?.isImpersonating,
                        text: 'End Impers',
                        minimal: true,
                        onClick: () => identityService.endImpersonateAsync()
                    }),
                    filler(),
                    dismissButton()
                ]
            }),
            exceptionDialogDetails()
        );
    }
});

/**
 * A Dismiss button that either forces reload, or allows close.
 * @internal
 */
export const dismissButton = hoistCmp.factory<ExceptionDialogModel>(({model}) => {
    return model.options.requireReload
        ? button({
              icon: Icon.refresh(),
              text: 'Reload App',
              onClick: () => XH.reloadApp()
          })
        : button({
              text: 'Close',
              onClick: () => model.close()
          });
});
