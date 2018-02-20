/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, hoistAppModel} from 'hoist';
import {button, dialog, dialogBody, dialogFooter, dialogFooterActions} from 'hoist/kit/blueprint';
import {observer} from 'hoist/mobx';
import {errorDialogDetails} from './ErrorDialogDetails';

@observer
export class ErrorDialog extends Component {

    render() {
        const model = this.model,
            {exception, options} = model;

        if (!exception) return null;

        return dialog({
            isOpen: true,
            title: options.title,
            icon: 'warning-sign',
            cls: hoistAppModel.darkTheme ? 'xh-dark' : '',
            items: [
                dialogBody(options.message),
                dialogFooter(
                    dialogFooterActions(this.getButtons())
                ),
                errorDialogDetails({model})
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}

    getButtons() {
        const showAsError = this.model.options.showAsError,
            sessionExpired = this.sessionExpired();

        return [
            button({
                icon: 'search',
                text: 'Show/Report Details',
                onClick: this.onShowDetailsClick,
                omit: sessionExpired || !showAsError
            }),
            button({
                icon: 'refresh',
                text: this.sessionExpired() ? 'Login' : 'Reload App',
                onClick: this.onReloadClick
            }),
            button({
                text: 'Close',
                onClick: this.onCloseClick
            })
        ];
    }

    onShowDetailsClick = () => {
        this.model.setDetailsVisible(true);
    }

    onCloseClick = () => {
        this.model.close();
    }

    onReloadClick = () => {
        hoistAppModel.reloadApp();
    }

    sessionExpired() {
        const e = this.model.exception;
        return e && e.httpStatus === 401;
    }
}
export const errorDialog = elemFactory(ErrorDialog);
