/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {defaultsDeep} from 'lodash';
import {clipboardButton} from './ClipboardButton';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience wrapper for a ClipboardButton to be rendered as a Blueprint menu item.
 */
export const [ClipboardMenuItem, clipboardMenuItem] = hoistCmp.withFactory({
    displayName: 'ClipboardMenuItem',
    model: false,
    observer: false,

    render(props) {
        const defaultOptions = {
            icon: Icon.clipboard(),
            text: 'Copy',
            minimal: true,
            successMessage: 'Text copied to clipboard.',
            style: {
                display: 'flex',
                width: '100%',
                justifyContent: 'left'
            }
        };

        const btnProps = defaultsDeep({}, props, defaultOptions);
        return clipboardButton(btnProps);
    }
});
ClipboardMenuItem.propTypes = {
    icon: PT.element,

    text: PT.string,

    /** Function returning the text to copy. */
    getCopyText: PT.func.isRequired,

    /** Message to be displayed in a toast when copy is complete. */
    successMessage: PT.string
};