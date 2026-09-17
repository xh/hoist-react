/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {TabSwitcherMenuContext} from '@xh/hoist/cmp/tab';
import {isMenuHeading, isMenuItem, type MenuItemLike, MenuToken} from '@xh/hoist/core';
import {bindMenuHeadingContext} from '@xh/hoist/utils/impl';

/** @internal */
export function getContextMenuItem(
    item: MenuItemLike<MenuToken, TabSwitcherMenuContext>,
    context: TabSwitcherMenuContext
): MenuItemLike<MenuToken, TabSwitcherMenuContext> {
    if (isMenuHeading(item)) return bindMenuHeadingContext(item, context);
    if (!isMenuItem(item)) return item;
    const ret = {...item};
    if (item.actionFn) ret.actionFn = e => item.actionFn(e, context);
    if (item.prepareFn) ret.prepareFn = e => item.prepareFn(e, context);
    if (item.items) ret.items = item.items.map(it => this.buildMenuItem(it, context));
    return ret;
}
