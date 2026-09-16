/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {MenuItemProps} from '@blueprintjs/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {createCopyHandler, CopyTextSpec} from './impl/CopyText';

export interface ClipboardMenuItemProps extends Omit<MenuItemProps, 'onClick'>, CopyTextSpec {}

/**
 * Menu item to copy text to the clipboard.
 *
 * Renders a true Blueprint menu item, so it aligns and highlights with the items around it.
 */
export const [ClipboardMenuItem, clipboardMenuItem] = hoistCmp.withFactory<ClipboardMenuItemProps>({
    displayName: 'ClipboardMenuItem',
    model: false,
    observer: false,

    render(props) {
        const {icon, text, getCopyText, errorMessage, successMessage, ...rest} = props;

        return menuItem({
            icon: withDefault(icon, Icon.clipboard()),
            text: withDefault(text, 'Copy'),
            onClick: createCopyHandler({getCopyText, errorMessage, successMessage}),
            ...rest
        });
    }
});
