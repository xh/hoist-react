/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, hspacer, vbox} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistModel,
    useLocalModel,
    type MenuContext,
    MenuItemLike,
    isMenuHeading,
    isMenuItem
} from '@xh/hoist/core';
import {listItem} from '@xh/hoist/kit/onsen';
import {bindable} from '@xh/hoist/mobx';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {
    filterMenuHeadings,
    isVisibleMenuEntry,
    resolveMenuHeading
} from '@xh/hoist/cmp/menu/impl/Menus';
import classNames from 'classnames';
import {clone, isEmpty} from 'lodash';
import {ReactNode, useEffect} from 'react';

import './Menu.scss';

/**
 * Internal Menu Component for MenuButton.
 *
 * Note that the Menu itself does not maintain open / close state - it is the responsibility
 * of the triggering component to manage this state. Requires an `onDismiss` callback to
 * facilitate closing the menu from within this component.
 *
 * @internal
 */
export const menu = hoistCmp.factory({
    displayName: 'Menu',
    className: 'xh-menu',

    render({menuItems, context, onDismiss, title, ...props}, ref) {
        const impl = useLocalModel(MenuLocalModel),
            items = impl.parseMenuItems(menuItems, context, onDismiss);

        useEffect(() => {
            if (isEmpty(items)) onDismiss();
        });

        return vbox({
            ref,
            items: [
                div({
                    omit: !title,
                    className: 'xh-menu__title',
                    item: title
                }),
                vbox({
                    className: 'xh-menu__list',
                    items
                })
            ],
            ...props
        });
    }
});

class MenuLocalModel extends HoistModel {
    override xhImpl = true;

    @bindable accessor pressedIdx: number;

    parseMenuItems(
        items: MenuItemLike[],
        context: MenuContext,
        onDismiss: () => void
    ): ReactNode[] {
        const {pressedIdx} = this;

        items = items.map(item => {
            if (isMenuHeading(item)) return resolveMenuHeading(item, context);
            if (!isMenuItem(item)) return item;

            item = clone(item);
            item.prepareFn?.(item, context);
            return item;
        });

        return items
            .filter(isVisibleMenuEntry)
            .filter(filterMenuHeadings(isMenuHeading))
            .filter(filterConsecutiveMenuSeparators())
            .map((item, idx) => {
                // Process dividers and headings
                if (item === '-') return div({key: idx, className: 'xh-menu__list__divider'});
                if (isMenuHeading(item)) {
                    return div({
                        key: idx,
                        className: classNames('xh-menu__list__heading', item.className),
                        item: item.heading
                    });
                }
                if (!isMenuItem(item)) return item;

                // Process items
                const {text, icon, className, actionFn, hidden, active} = item,
                    labelItems = icon ? [icon, hspacer(10), text] : [text];

                return listItem({
                    key: idx,
                    tappable: true,
                    className: classNames(
                        'xh-menu__list__item',
                        idx === pressedIdx ? 'xh-menu__list__item--pressed' : null,
                        active ? 'xh-menu__list__item--active' : null,
                        className
                    ),
                    item: div({className: 'center', items: labelItems}),
                    omit: hidden,
                    onTouchStart: () => (this.pressedIdx = idx),
                    onTouchEnd: () => (this.pressedIdx = null),
                    onClick: e => {
                        this.pressedIdx = null;
                        if (actionFn) actionFn(e, context);
                        onDismiss();
                    }
                });
            });
    }
}
