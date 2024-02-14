/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {defaultsDeep} from 'lodash';
import {clipboardButton, ClipboardButtonProps} from './ClipboardButton';

/**
 * Convenience wrapper for a ClipboardButton to be rendered as a Blueprint menu item.
 */
export const [ClipboardMenuItem, clipboardMenuItem] = hoistCmp.withFactory<ClipboardButtonProps>({
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
