/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    isMenuHeading,
    isMenuItem,
    MenuHeading,
    MenuItemLike
} from '@xh/hoist/core/types/Interfaces';
import {isNil} from 'lodash';
import {isMenuSeparator} from './Separators';
import {isOmitted} from './IsOmitted';

/**
 * `Array.filter()` function to exclude menu entries that must not appear. This covers items and
 * headings that set `hidden` or `omit`, and the nulls that remain when a `displayFn` hides its own
 * heading. Tokens and raw elements always pass through.
 * @internal
 */
export function isVisibleMenuEntry(it: MenuItemLike | any): boolean {
    if (isNil(it)) return false;
    if (isMenuHeading(it)) return !isOmitted(it);
    if (isMenuItem(it)) return !it.hidden && !isOmitted(it);
    return true;
}

/**
 * Resolve a MenuHeading for display. Applies its `displayFn` over the static props, and returns
 * null if the heading must not appear.
 * @internal
 */
export function resolveMenuHeading<C>(heading: MenuHeading<C>, context?: C): MenuHeading<C> {
    const ret = heading.displayFn ? {...heading, ...heading.displayFn(context)} : heading;
    return ret.hidden || isOmitted(ret) ? null : ret;
}

/**
 * `Array.filter()` function to tidy menu headings and the separators around them:
 *
 *  - Drops a heading with nothing below it, either at the end of a menu or immediately before
 *    another heading. This runs *after* the filter that removes hidden items, so a heading drops
 *    with its section when that whole section hides itself.
 *  - Drops a separator directly above or below a heading, because a heading draws its own rule.
 *
 * Run this before {@link filterConsecutiveMenuSeparators}, which clears any separator left behind.
 *
 * @param isHeading - identifies a heading within the list. Each caller works with menu entries at
 *      a different stage, so each one supplies its own test.
 * @internal
 */
export function filterMenuHeadings(isHeading: (it: any) => boolean) {
    return (it: any, idx: number, arr: any[]) => {
        if (isMenuSeparator(it)) {
            return !isHeading(arr[idx - 1]) && !isHeading(arr[idx + 1]);
        }

        if (isHeading(it)) {
            const below = arr.slice(idx + 1),
                nextHeadingIdx = below.findIndex(isHeading),
                section = nextHeadingIdx === -1 ? below : below.slice(0, nextHeadingIdx);
            return section.some(next => !isMenuSeparator(next));
        }

        return true;
    };
}
