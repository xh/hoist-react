/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {defaultsDeep} from 'lodash';
import {clipboardButton} from './ClipboardButton';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience wrapper for a ClipboardButton to be rendered as a Blueprint menu item.
 */
@HoistComponent
export class ClipboardMenuItem extends Component {

    static propTypes = {
        icon: PT.element,

        text: PT.string,

        /** Function returning the text to copy. */
        getCopyText: PT.func.isRequired,

        /** Message to be displayed in a toast when copy is complete. */
        successMessage: PT.string
    };

    static defaultOptions = {
        icon: Icon.clipboard(),
        text: 'Copy',
        minimal: true,
        successMessage: 'Text copied to clipboard.',
        style: {
            display: 'flex',
            width: '100%',
            justifyContent: 'left'
        }
    }

    render() {
        const btnProps = defaultsDeep({}, this.props, ClipboardMenuItem.defaultOptions);
        return clipboardButton(btnProps);
    }

}
export const clipboardMenuItem = elemFactory(ClipboardMenuItem);