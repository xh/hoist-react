/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {filterChooser, FilterChooserProps} from './FilterChooser';

/**
 * A wrapper around a FilterChooser that renders in a popover when opened, allowing it to expand
 * vertically beyond the height of a toolbar.
 *
 * @deprecated Use `filterChooser({popover: true})` instead - the popover behavior is now a built-in
 *      mode of `FilterChooser`. This alias will be removed in a future major release.
 * @see FilterChooser
 */
export const [PopoverFilterChooser, popoverFilterChooser] =
    hoistCmp.withFactory<FilterChooserProps>({
        model: uses(FilterChooserModel),
        render(props) {
            return filterChooser({popover: true, ...props});
        }
    });
