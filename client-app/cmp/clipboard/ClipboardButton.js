/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import * as PT from 'prop-types';
import {elemFactory} from 'hoist';
import {button} from 'hoist/kit/blueprint';
import Clipboard from 'clipboard';
import {isFunction, defaults} from 'lodash'

import {observer} from 'hoist/mobx';

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

@observer
class ClipboardButton extends Component {

    static propTypes = {
        text: PT.oneOfType([PT.string, PT.func]),
        target: PT.oneOfType([PT.instanceOf(Element), PT.func]),
        action: PT.oneOf(['copy', 'cut']),
        buttonProps: PT.object
    }

    static defaultProps = {
        action: 'copy',
    }

    static buttonDefaults = {
        icon: 'clipboard',
        text: 'Copy'
    }

    render() {
        const buttonProps = defaults(
            {ref: this.manageClipboard},
            this.props.buttonProps,
            this.constructor.buttonDefaults
        );
        return button(buttonProps);
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
        this.clipboard.on('success', (e) => {
            // show toast
            e.clearSelection();
        });
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
};

export const clipboardButton = elemFactory(ClipboardButton);