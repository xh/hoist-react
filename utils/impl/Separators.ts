/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {filterConsecutive} from '../js';

/**
 * True if the given menu entry is a textless separator, in any of the forms produced along the
 * way - the '-' token, ag-Grid's 'separator' token, or a rendered Blueprint MenuDivider.
 * @internal
 */
export function isMenuSeparator(it: any): boolean {
    return (
        it === '-' || it === 'separator' || (it?.type?.name === 'MenuDivider' && !it.props?.title)
    );
}

/**
 * `Array.filter()` function to exclude consecutive separators within Blueprint and AgGrid menus.
 * @internal
 */
export function filterConsecutiveMenuSeparators() {
    return filterConsecutive(isMenuSeparator);
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
