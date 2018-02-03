/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, hoistAppModel} from 'hoist';
import {hoistButton, header, modal, modalActions, modalContent} from 'hoist/kit/semantic';
import {observer} from 'hoist/mobx';
import {errorDialogDetails} from './ErrorDialogDetails';

@observer
export class ErrorDialog extends Component {

    render() {
        const model = this.model,
            {exception, options} = model;

        if (!exception) return null;

        return modal({
            open: true,
            items: [
                header({
                    icon: 'attention',
                    content: options.title
                }),
                modalContent(options.message),
                modalActions(this.getButtons()),
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
            hoistButton({
                icon: 'search',
                content: 'Show/Report Details',
                onClick: this.onShowDetailsClick,
                hidden: sessionExpired|| !showAsError
            }),
            hoistButton({
                icon: 'refresh',
                content: this.sessionExpired() ? 'Login' : 'Reload App',
                onClick: this.onReloadClick
            }),
            hoistButton({
                icon: 'close',
                content: 'Close',
                onClick: this.onCloseClick
            })
        ].filter(it => !it.hidden);
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
