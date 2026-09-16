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
 * `Array.filter()` function to exclude menu entries that should not be shown - i.e. items and
 * headings flagged `hidden` or `omit`, along with the nulls left behind by a heading that its own
 * `displayFn` has hidden. Tokens and raw elements always pass through.
 * @internal
 */
export function isVisibleMenuEntry(it: MenuItemLike | any): boolean {
    if (isNil(it)) return false;
    if (isMenuHeading(it)) return !isOmitted(it);
    if (isMenuItem(it)) return !it.hidden && !isOmitted(it);
    return true;
}

/**
 * Resolve a MenuHeading for display, applying its `displayFn` over the statically configured
 * props. Returns null if the heading should not be shown.
 * @internal
 */
export function resolveMenuHeading<C>(heading: MenuHeading<C>, context?: C): MenuHeading<C> {
    const ret = heading.displayFn ? {...heading, ...heading.displayFn(context)} : heading;
    return ret.hidden || isOmitted(ret) ? null : ret;
}

/**
 * `Array.filter()` function to tidy up menu headings and the separators around them:
 *
 *  - Drops headings with nothing below them - i.e. at the end of a menu, or immediately followed
 *    by another heading. Note this runs *after* hidden items have been removed, so a heading whose
 *    entire section hides itself drops along with it.
 *  - Drops separators directly above or below a heading, as headings render their own rule.
 *
 * Run ahead of {@link filterConsecutiveMenuSeparators} to clean up any separators left behind.
 *
 * @param isHeading - identifies a heading within the list being filtered. Callers work with menu
 *      entries at different stages of processing, so each supplies its own test.
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
