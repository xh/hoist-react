/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {clipboardButton} from './ClipboardButton';
import {elemFactory} from 'hoist/core';


class ClipboardMenuItem extends Component {

    static defaultProps = {
        icon: 'clipboard',
        text: 'Copy',
        cls: 'pt-minimal',
        successMessage: 'Text copied to clipboard.',
        style: {
            display: 'flex',
            width: '100%',
            justifyContent: 'left'
        }
    }

    render() {
        return clipboardButton(this.props);
    }
}

export const clipboardMenuItem = elemFactory(ClipboardMenuItem);