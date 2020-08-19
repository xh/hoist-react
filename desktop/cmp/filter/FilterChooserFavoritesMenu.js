/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon/Icon';
import {isEmpty} from 'lodash';
import classNames from 'classnames';

/**
 * A menu control for adding, loading and managing favorite filters.
 * @see FilterChooserModel
 */
export const filterChooserFavoritesMenu = hoistCmp.factory({
    model: uses(FilterChooserModel),
    render() {
        return hbox({
            className: 'xh-filter-chooser-favorites',
            items: [
                addButton(),
                popover({
                    interactionKind: 'click',
                    item: button({icon: Icon.chevronDown()}),
                    content: favoritesMenu()
                })
            ]
        });
    }
});

const addButton = hoistCmp.factory({
    render({model}) {
        const isFavorite = model.isFavorite(model.value);
        return button({
            className: classNames('xh-filter-chooser-favorites__add-btn', isFavorite ? 'favorite' : null),
            icon: Icon.favorite({prefix: isFavorite ? 'fas' : 'fal'}),
            onClick: () => model.addFavorite(model.value)
        });
    }
});

const favoritesMenu = hoistCmp.factory({
    render({model}) {
        const items = model.favoritesOptions?.map(opt => favoriteMenuItem({...opt}));
        return !isEmpty(items) ? menu({items}) : null;
    }
});

const favoriteMenuItem = hoistCmp.factory({
    render({model, text, value}) {
        return menuItem({
            text,
            className: 'xh-filter-chooser-favorites__item',
            onClick: () => model.setValue(value),
            labelElement: button({
                icon: Icon.cross(),
                intent: 'danger',
                onClick: (e) => {
                    model.removeFavorite(value);
                    e.stopPropagation();
                }
            })
        });
    }
});