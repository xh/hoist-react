/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div, hspacer, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel} from '@xh/hoist/core';
import {listItem} from '@xh/hoist/kit/onsen';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty, isFunction} from 'lodash';
import PT from 'prop-types';
import {isValidElement} from 'react';

import './Menu.scss';

/**
 * Internal Menu Component for MenuButton.
 *
 * Note that the Menu itself does not maintain open / close state - it is the responsibility
 * of the triggering component to manage this state. Pass an `onDismiss` callback to
 * facilitate closing the menu from within this component.
 *
 * @internal
 */
export const [Menu, menu] = hoistCmp.withFactory({
    displayName: 'Menu',
    className: 'xh-menu',

    render({menuItems, onDismiss, title, ...props}, ref) {
        const impl = useLocalModel(LocalModel),
            items = impl.parseMenuItems(menuItems, onDismiss);

        if (isEmpty(items)) return null;
        throwIf(!isFunction(onDismiss), 'Menu requires an `onDismiss` callback function');

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

class MenuModel extends HoistModel {
    xhImpl = true;

    @bindable pressedIdx;

    constructor() {
        super();
        makeObservable(this);
    }

    parseMenuItems(items, onDismiss) {
        const {pressedIdx} = this;
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
