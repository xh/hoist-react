/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {div, hspacer, vbox} from '@xh/hoist/cmp/layout';
import {listItem} from '@xh/hoist/kit/onsen';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isEmpty} from 'lodash';
import {isValidElement} from 'react';
import PT from 'prop-types';

import './Menu.scss';
import {MenuItem} from '../MenuItem';

/**
 * Menu Component.
 *
 * Not typically created directly, but instead created via a MenuButton or similar affordance.
 *
 * Note that the Menu itself does not maintain open / close state - it is the responsibility
 * of the triggering component to manage this state. Pass an `onDismiss` callback to
 * facilitate closing the menu from within this component.
 *
 * @see MenuButton
 * @private
 */
export const [Menu, menu] = hoistCmp.withFactory({
    displayName: 'Menu',
    model: false,
    className: 'xh-menu',
    render(props, ref) {
        const {menuItems, onDismiss, ...rest} = props,
            items = parseMenuItems(menuItems, onDismiss);

        if (isEmpty(items)) return null;
        throwIf(!isFunction(onDismiss), 'Menu requires an `onDismiss` callback function');

        return vbox({
            ref,
            item: vbox({
                className: 'xh-menu__list',
                items
            }),
            ...rest
        });
    }
});

Menu.propTypes = {
    /** Array of MenuItems or configs to create them */
    menuItems: PT.arrayOf(PT.oneOfType([PT.instanceOf(MenuItem), PT.object])).isRequired,

    /** Callback triggered when use dismisses the menu */
    onDismiss: PT.func.isRequired
};

//---------------------------
// Implementation
//---------------------------
function parseMenuItems(items, onDismiss) {
    return items
        .filter(it => !it.omit)
        .map(item => {
            if (item === '-' || isValidElement(item)) return item;
            if (!(item instanceof MenuItem)) {
                item = new MenuItem(item);
            }
            if (item.prepareFn) item.prepareFn(item);
            return item;
        })
        .filter(it => !it.hidden)
        .map((item, idx) => {
            const {text, icon, actionFn, hidden} = item,
                labelItems = icon ? [icon, hspacer(10), text] : [text];

            return listItem({
                key: idx,
                tappable: true,
                item: div({className: 'center', items: labelItems}),
                omit: hidden,
                onClick: () => {
                    if (actionFn) actionFn();
                    onDismiss();
                }
            });
        });
}