/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, hspacer, vbox} from '@xh/hoist/cmp/layout';
import type {MenuItemLike} from '@xh/hoist/core';
import {
    hoistCmp,
    HoistModel,
    useLocalModel,
    type MenuContext,
    isMenuHeading,
    isMenuItem
} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {TEST_ID} from '@xh/hoist/utils/js';
import {
    filterMenuHeadings,
    isVisibleMenuEntry,
    resolveMenuHeading,
    stopRightElementControlEvent
} from '@xh/hoist/cmp/menu/impl/Menus';
import classNames from 'classnames';
import {clone, isEmpty} from 'lodash';
import type {ReactNode} from 'react';
import {useEffect} from 'react';

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
            ...props,
            children: [
                div({
                    omit: !title,
                    className: 'xh-menu__title',
                    children: title
                }),
                vbox({
                    className: 'xh-menu__list',
                    children: items
                })
            ]
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
                        children: item.heading
                    });
                }
                if (!isMenuItem(item)) return item;

                // Process items
                const {
                        text,
                        icon,
                        className,
                        actionFn,
                        hidden,
                        active,
                        keepMenuOpen,
                        rightElement,
                        testId
                    } = item,
                    labelItems = icon ? [icon, hspacer(10), text] : [text];

                return div({
                    key: idx,
                    className: classNames(
                        'xh-menu__list__item',
                        idx === pressedIdx ? 'xh-menu__list__item--pressed' : null,
                        active ? 'xh-menu__list__item--active' : null,
                        className
                    ),
                    children: [
                        div({
                            className: 'xh-menu__list__item__content',
                            children: labelItems
                        }),
                        div({
                            omit: rightElement == null,
                            className: 'xh-menu__list__item__right',
                            onClick: stopRightElementControlEvent,
                            onTouchStart: stopRightElementControlEvent,
                            children: rightElement
                        })
                    ],
                    omit: hidden,
                    [TEST_ID]: testId,
                    onTouchStart: () => (this.pressedIdx = idx),
                    onTouchEnd: () => (this.pressedIdx = null),
                    onClick: e => {
                        this.pressedIdx = null;
                        if (actionFn) actionFn(e, context);
                        if (!keepMenuOpen) onDismiss();
                    }
                });
            });
    }
}
