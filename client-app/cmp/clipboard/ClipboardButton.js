/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PropTypes from 'prop-types';
import {elemFactory} from 'hoist';
import {button} from 'hoist/kit/blueprint';
import Clipboard from 'clipboard';

import {observer} from 'hoist/mobx';

/**
 * Button that copies content to the clipboard.
 * This wraps the https://clipboardjs.com/ libary
 * Params text, target, action, and container are hooks into the same params in clipboard.js
 *
 * Either text or target param must be used.
 * @param text, string or function that returns one  - this is the text string that will be copied
 * @param target, DOM element or function that returns one - the target is a textarea or input DOM element whose value will be copied
 *
 * @param action, string - either 'copy' or 'cut' - optional, defaults to 'copy'
 * @param container, DOM element or function that returns one - optional, defaults to undefined
 *
 * @param buttonProps, object - optional - config object with any prop that can be passed to the blueprint button component
**/

@observer
class ClipboardButton extends Component {

    static propTypes = {
        text: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.func
        ]),
        target: PropTypes.oneOfType([
            PropTypes.instanceOf(Element),
            PropTypes.func
        ]),
        container: PropTypes.oneOfType([
            PropTypes.instanceOf(Element),
            PropTypes.func
        ]),
        action: PropTypes.oneOf(['copy', 'cut']),
        buttonProps: PropTypes.object
    }

    static defaultProps = {
        action: 'copy',
        buttonProps: {
            icon: 'clipboard',
            text: 'Copy'
        }
    }

    render() {
        this.props.buttonProps.ref = this.manageClipboard.bind(this);
        return button(this.props.buttonProps);
    }

    manageClipboard(btn) {
        if (!btn || !btn.buttonRef) {
            this.destroyClipboard();
            return;
        }
        this.createClipboard(btn.buttonRef);
    }

    createClipboard(btnDom) {
        const options = {
            action: this.props.action
        };

        ['container', 'target', 'text'].forEach((prop) => {
            if (this.props[prop] !== undefined) {
                options[prop] = this.getCopyVal(prop);
            }
        });

        this.clipboard = new Clipboard(btnDom, options);
        this.clipboard.on('success', (e) => {
            // show toast

            e.clearSelection();
        });
    }

    destroyClipboard() {
        this.clipboard && this.clipboard.destroy();
    }

    getCopyVal(prop) {
        return (trigger) => {
            const val = this.props[prop];
            if (typeof val === 'function') return val(trigger);
            return val;
        };
    }

};

export const clipboardButton = elemFactory(ClipboardButton);