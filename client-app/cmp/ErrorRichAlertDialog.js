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
            onClose: this.onClose,
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
                    items: this.renderButtons()
                })
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    renderButtons() {
        const showAsError = hoistAppStore.clientError.options.showAsError,
            btns = [
                button({
                    text: 'Show/Report Details...',
                    onClick: this.showErrorDetails
                }),
                button({
                    text: this.getReloadBtnText(),
                    onClick: this.onReload
                }),
                button({
                    text: 'Close',
                    intent: 'Intent.PRIMARY',
                    onClick: this.onClose
                })
            ];

        if (this.sessionExpired() || !showAsError) {btns.shift()}

        return btns;
    }

    onClose = () => {
        hoistAppStore.setClientError(null);
    }

    onReload = () => {
        window.location.reload(true);
    }

    getReloadBtnText() {
        return this.sessionExpired() ? 'Login' : 'Reload';
    }

    showErrorDetails() {
        alert('details forthcoming');
    }

    sessionExpired() {
        const {e} = hoistAppStore.clientError;
        return e && e.httpStatus === 401;
    }
}