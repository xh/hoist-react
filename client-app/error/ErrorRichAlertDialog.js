/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';

import {button, header, modal, modalActions, modalContent} from 'hoist/kit/semantic';
import {action, observer, observable} from 'hoist/mobx';
import {errorDetailsDialog} from 'hoist/error';
import {hoistAppModel} from 'hoist/app/HoistAppModel';


@observer
export class ErrorRichAlertDialog extends Component {

    @observable detailsDialog = {
        isVisible: false
    }

    render() {
        if (!hoistAppModel.clientError) return null;

        const {options} = hoistAppModel.clientError;

        return modal({
            open: true,
            items: [
                header({
                    icon: 'attention',
                    content: options.title
                }),
                modalContent(options.message),
                modalActions(this.renderButtons()),
                errorDetailsDialog({
                    visManager: this.detailsDialog,
                    exception: hoistAppModel.clientError.exception
                })
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    renderButtons() {
        const showAsError = hoistAppModel.clientError.options.showAsError,
            btns = [
                button({
                    labelPosition: 'left',
                    icon: 'search',
                    content: 'Show/Report Details',
                    onClick: this.onShowErrorDetailsClick
                }),
                button({
                    labelPosition: 'left',
                    icon: 'refresh',
                    content: this.getReloadBtnText(),
                    onClick: this.onReloadClick
                }),
                button({
                    labelPosition: 'left',
                    icon: 'close',
                    content: 'Close',
                    onClick: this.onClose
                })
            ];

        if (this.sessionExpired() || !showAsError) {btns.shift()}

        return btns;
    }

    @action
    onShowErrorDetailsClick = () => {
        this.detailsDialog.isVisible = true;
    }

    onReloadClick = () => {
        window.location.reload(true);
    }

    onClose = () => {
        hoistAppModel.setClientError(null);
    }

    getReloadBtnText() {
        return this.sessionExpired() ? 'Login' : 'Reload';
    }

    sessionExpired() {
        const {exception} = hoistAppModel.clientError;
        return exception && exception.httpStatus === 401;
    }
}