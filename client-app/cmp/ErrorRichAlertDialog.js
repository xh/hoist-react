/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {div} from 'hoist/layout';

import {button, dialog } from 'hoist/blueprint';
import {observer} from 'hoist/mobx';
import {hoistAppStore} from '../app/HoistAppStore';

@observer
export class ErrorRichAlertDialog extends Component {

    render() {
        if (!hoistAppStore.clientError) return null;

        const {options} = hoistAppStore.clientError;

        return dialog({
            isOpen: !!hoistAppStore.clientError,
            onClose: this.closeHandler,
            title: options.title,
            iconName: 'error',
            items: [
                div({
                    cls: 'pt-dialog-body',
                    items: options.message
                }),
                div({
                    cls: 'pt-dialog-footer',
                    style: {textAlign: 'right'},
                    items: this.getButtons()
                })
            ]
        });
    };

    //--------------------------------
    // Implementation
    //--------------------------------
    getButtons = () => {
        const showAsError = hoistAppStore.clientError.options.showAsError,
            btns = [
                button({
                    text: 'Show/Report Details...',
                    onClick: this.showErrorDetails
                }),
                button({
                    text: this.getReloadBtnText(),
                    onClick: () => window.location.reload(true)
                }),
                button({
                    text: 'Close',
                    intent: 'Intent.PRIMARY',
                    onClick: this.closeHandler
                })
            ];

        if (this.sessionExpired() || !showAsError) {btns.shift()}

        return btns;
    };

    getReloadBtnText = () => {
        return this.sessionExpired() ? 'Login' : 'Reload';
    };

    showErrorDetails = () => {
        alert('details forthcoming');
    };

    closeHandler = () => {
        hoistAppStore.setClientError(null);
    };

    sessionExpired() {
        const {e} = hoistAppStore.clientError;
        return e && e.httpStatus === 401;
    };
}