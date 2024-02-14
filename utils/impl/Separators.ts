/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {filterConsecutive} from '../js';

/**
 * `Array.filter()` function to exclude consecutive separators within Blueprint and AgGrid menus.
 * @internal
 */
export function filterConsecutiveMenuSeparators() {
    return filterConsecutive((it: any) => {
        return (
            it === '-' ||
            it === 'separator' ||
            (it?.type?.name === 'MenuDivider' && !it.props?.title)
        );
    });
}

/**
 * `Array.filter()` function to exclude consecutive separators within Toolbars.
 * @internal
 */
export function filterConsecutiveToolbarSeparators() {
    return filterConsecutive((it: any) => {
        return it === '-' || it?.type?.displayName === 'ToolbarSeparator';
    });
}
