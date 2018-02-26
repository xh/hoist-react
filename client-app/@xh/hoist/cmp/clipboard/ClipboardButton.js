/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import * as PT from 'prop-types';
import {isFunction, defaults} from 'lodash';
import {hoistComponent, XH, elemFactory} from 'hoist/core';
import {Intent, button} from 'hoist/kit/blueprint';
import {ToastManager} from 'hoist/cmp';

import Clipboard from 'clipboard';

/**
 * Button that copies content to the clipboard.
 * This wraps the https://clipboardjs.com/ libary
 * Props text, target, and action are hooks into the same params in clipboard.js
 *
 * Either text or target param must be used.
 * @prop text, the text string that will be copied
 * @prop target, the textarea or input DOM element whose value will be copied
 * @prop action, either 'copy' or 'cut'
 *
 * @prop buttonProps, object - optional - config object with any prop that can be passed to the blueprint button component
**/

@hoistComponent()
export class ClipboardButton extends Component {

    static propTypes = {
        text: PT.oneOfType([PT.string, PT.func]),
        target: PT.oneOfType([PT.instanceOf(Element), PT.func]),
        action: PT.oneOf(['copy', 'cut']),
        buttonProps: PT.object
    }

    static defaultProps = {
        action: 'copy',
        successMessage: 'Text copied to clipboard.'
    }

    static buttonDefaults = {
        icon: 'clipboard',
        text: 'Copy'
    }

    buttonProps = null

    render() {
        this.buttonProps = defaults(
            {ref: this.manageClipboard},
            this.props.buttonProps,
            this.constructor.buttonDefaults
        );
        return button(this.buttonProps);
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
        const options = {
            action: this.props.action
        };

        ['target', 'text'].forEach(prop => {
            if (prop in this.props) {
                options[prop] = this.getPropVal(prop);
            }
        });

        this.clipboard = new Clipboard(btnDom, options);
        this.clipboard.on('success', this.onCopySuccess);
        this.clipboard.on('error', this.onCopyError);
    }

    destroyClipboard() {
        if (this.clipboard) this.clipboard.destroy();
    }

    getPropVal(prop) {
        return (trigger) => {
            const val = this.props[prop];
            if (isFunction(val)) return val(trigger);
            return val;
        };
    }

    onCopySuccess = (e) => {
        this.showToast({
            intent: Intent.SUCCESS,
            message: this.props.successMessage
        });
        e.clearSelection();
    }

    onCopyError = (e) => {
        const exc = XH.exception('Failed to copy text to clipboard.');
        XH.handleException(exc, {showAlert: false});
        e.clearSelection();
    }

    showToast(toastProps) {
        const allProps = defaults(
            {
                icon: this.buttonProps.icon,
                timeout: 3000
            },
            toastProps
        );
        ToastManager.getToaster().show(allProps);
    }
};
export const clipboardButton = elemFactory(ClipboardButton);