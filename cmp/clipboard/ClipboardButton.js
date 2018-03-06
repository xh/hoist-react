/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, XH, elemFactory} from 'hoist/core';
import {Intent, button} from 'hoist/kit/blueprint';
import {ToastManager} from 'hoist/cmp';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

import Clipboard from 'clipboard';

/**
 * Button that copies content to the clipboard.
 * This button utilizes the https://clipboardjs.com/ library.
 *
 * @prop clipboardSpec, an object appropriate for the clipboard js library, e.g.
 *      {
 *          text: a function that return the text string that will be copied
 *          target: a function that returns the textarea or input DOM element whose value will be copied.
 *          action: either 'copy' or 'cut',
 *      }
 * @prop successMessage - optional
 *
 *  ... and any other props that can be passed to a blueprint button component.
**/
@hoistComponent()
export class ClipboardButton extends Component {

    static defaultProps = {
        icon: 'clipboard',
        text: 'Copy',
        successMessage: 'Text copied to clipboard.'
    }

    render() {
        const {successMessage, clipboardSpec, ...rest} = this.props;
        return button({...rest, ref: this.manageClipboard});
    }

    //---------------------------
    // Implementation
    //---------------------------
    manageClipboard = (btn) => {
        if (btn && btn.buttonRef) {
            this.createClipboard(btn.buttonRef);
        } else {
            this.destroyClipboard();
        }
    }

    createClipboard(btnDom) {
        const clipboardSpec = Object.assign({action: 'copy'}, this.props.clipboardSpec);

        this.clipboard = new Clipboard(btnDom, clipboardSpec);
        this.clipboard.on('success', this.onCopySuccess);
        this.clipboard.on('error', this.onCopyError);
    }

    destroyClipboard() {
        if (this.clipboard) this.clipboard.destroy();
    }

    onCopySuccess = (e) => {
        const {successMessage} = this.props;
        if (successMessage) {
            this.showToast({
                intent: Intent.SUCCESS,
                message: successMessage
            });
        }
        e.clearSelection();
    }

    onCopyError = (e) => {
        const exc = XH.exception('Failed to copy text to clipboard.');
        XH.handleException(exc, {showAlert: false});
        e.clearSelection();
    }

    showToast(toastProps) {
        toastProps.icon = this.props.icon;
        toastProps.timeout = 3 * SECONDS;
        ToastManager.getToaster().show(toastProps);
    }
}
export const clipboardButton = elemFactory(ClipboardButton);