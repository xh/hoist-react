/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {defaultsDeep} from 'lodash';
import {clipboardButton} from './ClipboardButton';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience wrapper for a ClipboardButton to be rendered as a Blueprint menu item.
 * Accepts props documented below as well as any supported by Blueprint's Button or ClipboardButton cmp.
 */
@HoistComponent()
export class ClipboardMenuItem extends Component {

    static propTypes = {
        icon: PT.element,
        text: PT.string,
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