/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {hoistComponent, XH, elemFactory} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {ToastManager} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import ClipboardJS from 'clipboard';

/**
 * Button to copy text to the clipboard - via the clipboard.js library (https://clipboardjs.com).
 */
@hoistComponent()
export class ClipboardButton extends Component {

    static propTypes = {
        /** Spec object as expected by the clipboard.js library. */
        clipboardSpec: PT.shape({
            /** Function returning the text to copy. */
            text: PT.function,
            /** Function returning the textarea or input DOM element whose value will be copied. */
            target: PT.function,
            /** Action to take when pointing at a target element containing text - default is copy. */
            action: PT.oneOf(['copy', 'cut'])
        }).isRequired,
        icon: PT.element,
        text: PT.string,
        successMessage: PT.string
    };

    render() {
        const {icon, successMessage, text, clipboardSpec, ...rest} = this.props;
        return button({
            icon: icon || Icon.clipboard(),
            text: text || 'Copy',
            ref: this.manageClipboard,
            ...rest
        });
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

        this.clipboard = new ClipboardJS(btnDom, clipboardSpec);
        this.clipboard.on('success', this.onCopySuccess);
        this.clipboard.on('error', this.onCopyError);
    }

    destroyClipboard() {
        if (this.clipboard) this.clipboard.destroy();
    }

    onCopySuccess = (e) => {
        e.clearSelection();

        const {successMessage} = this.props;
        if (successMessage) {
            ToastManager.show({
                message: successMessage,
                icon: Icon.clipboard()
            });
        }
    }

    onCopyError = (e) => {
        XH.handleException('Failed to copy text to clipboard.', {showAlert: false});
        e.clearSelection();
    }
}
export const clipboardButton = elemFactory(ClipboardButton);