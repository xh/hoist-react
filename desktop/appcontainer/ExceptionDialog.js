/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler, fragment} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';

import {ExceptionDialogModel} from '@xh/hoist/core/appcontainer/ExceptionDialogModel';

import {exceptionDialogDetails} from './ExceptionDialogDetails';
import './ExceptionDialog.scss';

/**
 * Dialog for display of exceptions, with support for viewing a detailed stacktrace
 * and an option to force the reload of the application (in the case of a fatal exception).
 *
 * @private
 */
@HoistComponent
export class ExceptionDialog extends Component {

    static modelClass = ExceptionDialogModel;
    
    render() {
        const {model} = this,
            {exception, options} = model;

        if (!exception) return null;

        return fragment(
            dialog({
                isOpen: true,
                title: options.title,
                isCloseButtonShown: !options.requireReload,
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
        const {model} = this;
    
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
    };
    
    onCloseClick = () => {
        this.model.close();
    };
}
export const exceptionDialog = elemFactory(ExceptionDialog);


/**
 * A Dismiss button that either forces reload, or allows close.
 * @private
 */
@HoistComponent
class DismissButton extends Component {
    render() {
        return this.model.options.requireReload ?
            button({
                icon: Icon.refresh(),
                text: this.sessionExpired() ? 'Login' : 'Reload App',
                onClick: this.onReloadClick
            }) :
            button({
                text: 'Close',
                onClick: this.onCloseClick
            });
    }

    onCloseClick = () => {
        this.model.close();
    };

    onReloadClick = () => {
        XH.reloadApp();
    };

    sessionExpired() {
        const e = this.model.exception;
        return e && e.httpStatus === 401;
    }
}
export const dismissButton = elemFactory(DismissButton);
