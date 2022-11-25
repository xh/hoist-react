/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div, hspacer, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, MenuItem, MenuItemLike} from '@xh/hoist/core';
import {listItem} from '@xh/hoist/kit/onsen';
import {observable, action, makeObservable} from '@xh/hoist/mobx';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import classNames from 'classnames';
import {clone, isEmpty, isString} from 'lodash';
import {isValidElement, ReactNode, useEffect} from 'react';

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

    render({menuItems, onDismiss, title, ...props}, ref) {
        const impl = useLocalModel(LocalMenuModel),
            items = impl.parseMenuItems(menuItems, onDismiss);

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

class LocalMenuModel extends HoistModel {
    xhImpl = true;

    @observable pressedIdx: number;
    @action setPressedIdx(v: number) {this.pressedIdx = v}

    constructor() {
        super();
        makeObservable(this);
    }

    parseMenuItems(items: MenuItemLike[], onDismiss: () => void): ReactNode[] {
        const {pressedIdx} = this;

        items = items.map(item => {
            if (!isMenuItem(item)) return item;

            item = clone(item);
            item.prepareFn?.(item);
            return item;
        });

        return items
            .filter(it => isMenuItem(it) && !it.omit && !it.hidden)
            .filter(filterConsecutiveMenuSeparators())
            .map((item, idx) => {
                // Process dividers
                if (!isMenuItem(item)) return item;

                // Process items
                const {text, icon, actionFn, hidden} = item,
                    labelItems = icon ? [icon, hspacer(10), text] : [text];

                return listItem({
                    key: idx,
                    tappable: true,
                    className: classNames(
                        'xh-menu__list__item',
                        idx === pressedIdx ? 'xh-menu__list__item--pressed' : null
                    ),
                    item: div({className: 'center', items: labelItems}),
                    omit: hidden,
                    onTouchStart: () => this.setPressedIdx(idx),
                    onTouchEnd: () => this.setPressedIdx(null),
                    onClick: () => {
                        this.setPressedIdx(null);
                        if (actionFn) actionFn();
                        onDismiss();
                    }
                });
            });
    }
}

function isMenuItem(item: MenuItemLike): item is MenuItem {
    return !isString(item) && !isValidElement(item);
}