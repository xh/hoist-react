/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistComponent, elemFactory, hoistComponentFactory} from 'hoist/core';
import {fragment} from 'hoist/layout';
import {toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {filler} from 'hoist/layout';
import {button, dialog, dialogBody} from 'hoist/kit/blueprint';

import {ExceptionDialogModel} from './ExceptionDialogModel';
import {exceptionDialogDetails} from './ExceptionDialogDetails';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force the reload of the application (in the case of a fatal exception).
 */
@hoistComponent()
export class ExceptionDialog extends Component {

    localModel = new ExceptionDialogModel()

    render() {
        const model = this.model,
            {exception, options} = model;

        if (!exception) return null;

        return fragment(
            dialog({
                title: options.title,
                isOpen: true,
                isCloseButtonShown: false,
                onClose: !options.requireReload ? this.onCloseClick : null,
                icon: Icon.warning({size: 'lg'}),
                items: [
                    dialogBody(options.message),
                    toolbar(this.getButtons())
                ]
            }),
            exceptionDialogDetails({model})
        );
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    getButtons() {
        const model = this.model;
    
        return [
            filler(),
            button({
                icon: Icon.search(),
                text: 'Show/Report Details',
                onClick: this.onShowDetailsClick,
                omit: !model.options.showAsError
            }),
            dismissButton({model})
        ];
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
                    icon: Icon.close(),
                    text: 'Close',
                    onClick: this.onCloseClick
                });
        }

        onCloseClick = () => {
            this.model.close();
        }

        onReloadClick = () => {
            XH.hoistModel.reloadApp();
        }

        sessionExpired() {
            const e = this.model.exception;
            return e && e.httpStatus === 401;
        }
    }
);
