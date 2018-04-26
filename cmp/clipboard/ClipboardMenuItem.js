/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {clipboardButton} from './ClipboardButton';
import {elemFactory} from 'hoist/core';
import {Icon} from 'hoist/icon';

/**
 * Convenience wrapper for a ClipboardButton to be rendered as a Blueprint menu item.
 * Accepts props documented below as well as any supported by Blueprint's Button or ClipboardButton cmp.
 */
class ClipboardMenuItem extends Component {

    static propTypes = {
        icon: PT.element,
        text: PT.string,
        cls: PT.string,
        successMessage: PT.string,
        style: PT.object
    };

    static defaultProps = {
        icon: Icon.clipboard(),
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