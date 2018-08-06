/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory, hoistComponentFactory} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './ExceptionDialog.scss';
import {exceptionDialogDetails} from './ExceptionDialogDetails';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force the reload of the application (in the case of a fatal exception).
 *
 * @private
 */
@HoistComponent()
export class ExceptionDialog extends Component {

    render() {
        const {model} = this,
            {exception, options} = model;

        if (!exception) return null;

        return fragment(
            dialog({
                isOpen: true,
                title: options.title,
                className: 'xh-exception-dialog',
                icon: Icon.warning(),
                content: options.message,
                onCancel: !options.requireReload ? this.onCloseClick : null,
                buttons: [
                    button({
                        icon: Icon.search(),
                        text: 'Show/Report Details',
                        onClick: this.onShowDetailsClick,
                        omit: !model.options.showAsError
                    }),
                    dismissButton({model})
                ]
            }),
            exceptionDialogDetails({model})
        );
    }

    onShowDetailsClick = () => {
        this.model.openDetails();
    }

    onCloseClick = () => {
        this.model.close();
    }

}
export const exceptionDialog = elemFactory(ExceptionDialog);

/**
 * A Dismiss button that either forces reload, or allows close.
 */
export const dismissButton = hoistComponentFactory(
    class extends Component {
        render() {
            return this.model.options.requireReload ?
                button({
                    icon: Icon.refresh(),
                    text: this.sessionExpired() ? 'Login' : 'Reload App',
                    onClick: this.onReloadClick
                }) :
                button({
                    text: 'Close',
                    modifier: 'outline',
                    onClick: this.onCloseClick
                });
        }

        onCloseClick = () => {
            this.model.close();
        }

        onReloadClick = () => {
            XH.reloadApp();
        }

        sessionExpired() {
            const e = this.model.exception;
            return e && e.httpStatus === 401;
        }
    }
);
