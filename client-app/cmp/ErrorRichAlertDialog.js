/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';

import {button, buttonContent, header, icon, modal, modalActions, modalContent} from 'hoist/kit/semantic';
import {action, observer, observable} from 'hoist/mobx';
import {errorDetailsDialog} from 'hoist/cmp';
import {hoistAppModel} from '../app/HoistAppModel';


@observer
export class ErrorRichAlertDialog extends Component {

    @observable detailsDialog = {
        isVisible: false
    }

    render() {
        if (!hoistAppModel.clientError) return null;

        const {options} = hoistAppModel.clientError;

        return modal({
            open: !!hoistAppModel.clientError,
            onClose: this.onClose,
            items: [
                header({
                    icon: 'attention',
                    content: options.title
                }),
                modalContent({
                    items: options.message
                }),
                modalActions({
                    style: {textAlign: 'right'},
                    items: this.renderButtons()
                }),
                errorDetailsDialog({visManager: this.detailsDialog, e: hoistAppModel.clientError.e})
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
                    cls: 'icon',
                    labelPosition: 'left',
                    items: [
                        icon({name: 'search'}),
                        buttonContent({content: 'Show/Report Details...'})
                    ],
                    onClick: this.onShowErrorDetails
                }),
                button({
                    cls: 'icon',
                    labelPosition: 'left',
                    items: [
                        icon({name: 'refresh'}),
                        buttonContent({content: this.getReloadBtnText()})
                    ],
                    onClick: this.onReload
                }),
                button({
                    cls: 'icon',
                    labelPosition: 'left',
                    items: [
                        icon({name: 'close'}),
                        buttonContent({content: 'Close'})
                    ],
                    onClick: this.onClose
                })
            ];

        if (this.sessionExpired() || !showAsError) {btns.shift()}

        return btns;
    }

    @action
    onShowErrorDetails = () => {
        this.detailsDialog.isVisible = true;
    }

    onClose = () => {
        hoistAppModel.setClientError(null);
    }

    onReload = () => {
        window.location.reload(true);
    }

    getReloadBtnText() {
        return this.sessionExpired() ? 'Login' : 'Reload';
    }

    sessionExpired() {
        const {e} = hoistAppModel.clientError;
        return e && e.httpStatus === 401;
    }
}