/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {MenuItem} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import type {ReactNode} from 'react';
import {type CopyTextSpec, createCopyHandler} from './CopyText';

export interface ClipboardMenuItemSpec extends Omit<MenuItem, 'text' | 'actionFn'>, CopyTextSpec {
    /** Item text. Defaults to 'Copy'. */
    text?: ReactNode;
}

/**
 * Create a menu item that copies text to the clipboard.
 *
 * Returns a standard {@link MenuItem} config, for use within any menu that accepts
 * `MenuItemLike` entries - desktop and mobile menus, context menus, and menu buttons alike.
 */
export function clipboardMenuItem(spec: ClipboardMenuItemSpec): MenuItem {
    const {text, icon, getCopyText, errorMessage, successMessage, ...rest} = spec;
    return {
        text: withDefault(text, 'Copy'),
        icon: withDefault(icon, Icon.clipboard()),
        actionFn: createCopyHandler({getCopyText, errorMessage, successMessage}),
        ...rest
    };
}
