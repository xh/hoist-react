/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon/Icon';
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
            onClick: () => model.addToFavorites()
        });
    }
});

const favoritesMenu = hoistCmp.factory({
    render({model}) {
        return menu({
            items: [
                ...model.favoritesOptions?.map(opt => favoriteMenuItem({...opt})),
                menuDivider(),
                menuItem({
                    icon: Icon.table(),
                    text: 'Manage Favorites',
                    onClick: () => console.log('Manage favorites') // Todo: Dialog
                })
            ].filter(filterConsecutiveMenuSeparators())
        });
    }
});

const favoriteMenuItem = hoistCmp.factory({
    render({model, text, value}) {
        return menuItem({
            text,
            className: 'xh-filter-chooser-favorites__item',
            onClick: () => model.setValue(value)
        });
    }
});