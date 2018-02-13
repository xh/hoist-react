/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {button} from 'hoist/kit/blueprint';
import Clipboard from 'clipboard';

import {observer} from 'hoist/mobx';

@observer
class ClipboardButton extends Component {

    render() {
        return button({
            icon: 'clipboard',
            text: this.props.text,
            ref: this.manageClipboard.bind(this)
        });
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
            text: () => this.props.value
        };

        this.clipboard = new Clipboard(btnDom, options);
        this.clipboard.on('success', (e) => {
            // show toast

            e.clearSelection();
        });
    }

    destroyClipboard() {
        this.clipboard && this.clipboard.destroy();
    }
};

export const clipboardButton = elemFactory(ClipboardButton);