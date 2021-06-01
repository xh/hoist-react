/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {filterConsecutive} from '../js';

/**
 * @private
 *
 * A function to be passed to `array.filter()`, than excludes consecutive separators
 * for both Blueprint and AgGrid menus.
 */
export function filterConsecutiveMenuSeparators() {
    return filterConsecutive(it => {
        return it === '-' || it === 'separator' || it?.type?.name === 'MenuDivider';
    });
}

/**
 * @private
 *
 * A function to be passed to `array.filter()`, than excludes consecutive separators
 * for both toolbars.
 */
export function filterConsecutiveToolbarSeparators() {
    return filterConsecutive(it => {
        return it === '-' || it?.type?.displayName === 'ToolbarSeparator';
    });
}
