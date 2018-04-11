/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory, hoistModel} from 'hoist/core';
import {fragment} from 'hoist/layout';
import {toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {filler} from 'hoist/layout';
import {button, dialog, dialogBody} from 'hoist/kit/blueprint';

import {errorDialogDetails} from './ErrorDialogDetails';

@hoistComponent()
export class ErrorDialog extends Component {

    render() {
        const model = this.model,
            {exception, options} = model;

        if (!exception) return null;

        return fragment(
            dialog({
                isOpen: true,
                title: options.title,
                onClose: this.onCloseClick,
                icon: Icon.warning({size: 'lg'}),
                items: [
                    dialogBody(options.message),
                    toolbar(this.getButtons())
                ]
            }),
            errorDialogDetails({model})
        );
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    getButtons() {
        const showAsError = this.model.options.showAsError,
            sessionExpired = this.sessionExpired();

        return [
            filler(),
            button({
                icon: Icon.search(),
                text: 'Show/Report Details',
                onClick: this.onShowDetailsClick,
                omit: sessionExpired || !showAsError
            }),
            button({
                icon: Icon.refresh(),
                text: this.sessionExpired() ? 'Login' : 'Reload App',
                onClick: this.onReloadClick
            }),
            button({
                icon: Icon.close(),
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
        hoistModel.reloadApp();
    }

    sessionExpired() {
        const e = this.model.exception;
        return e && e.httpStatus === 401;
    }
}
export const errorDialog = elemFactory(ErrorDialog);
