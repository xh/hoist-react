/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {box, div, hbox, hframe} from '@xh/hoist/cmp/layout';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {Select, select} from '@xh/hoist/desktop/cmp/input';
import {menu, menuItem, menuDivider, popover} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import {isEmpty} from 'lodash';
import classNames from 'classnames';

import './FilterChooser.scss';

/**
 * A Select based control for searching and choosing filters.
 * @see FilterChooserModel
 */
export const [FilterChooser, filterChooser] = hoistCmp.withFactory({
    model: uses(FilterChooserModel),
    className: 'xh-filter-chooser',
    render({model, className, ...props}) {
        const [layoutProps, rest] = splitLayoutProps(props),
            {inputRef, selectOptions, favoritesIsOpen} = model;

        return box({
            className,
            ...layoutProps,
            item: popover({
                item: select({
                    flex: 1,
                    bind: 'selectValue',
                    ref: inputRef,
                    placeholder: 'Filter...',
                    enableMulti: true,
                    enableClear: true,
                    queryFn: (q) => model.queryAsync(q),
                    options: selectOptions,
                    optionRenderer,
                    rsOptions: {
                        defaultOptions: [],
                        openMenuOnClick: false,
                        openMenuOnFocus: false,
                        isOptionDisabled: (opt) => opt.value === FilterChooserModel.TRUNCATED,
                        styles: {
                            menuList: (base) => ({...base, maxHeight: 'unset'})
                        },
                        components: {
                            DropdownIndicator: () => favoritesIcon(model)
                        }
                    },
                    ...rest
                }),
                content: favoritesMenu(),
                isOpen: favoritesIsOpen,
                position: 'bottom-right',
                minimal: true,
                onInteraction: (willOpen) => {
                    if (!willOpen) model.closeFavoritesMenu();
                }
            })
        });
    }
});

FilterChooser.propTypes = {
    ...Select.propTypes
};


//-----------------
// Options
//------------------
function optionRenderer(opt) {
    if (opt.isSuggestion) return suggestionOption(opt);
    if (opt.value === FilterChooserModel.TRUNCATED) return truncatedMessage(opt);
    return filterOption(opt);
}

const filterOption = hoistCmp.factory({
    model: false, observer: false,
    render({displayName, op, displayValue}) {
        return hframe({
            className: 'xh-filter-chooser-option',
            items: [
                div({className: 'name', item: displayName}),
                div({className: 'operator', item: op}),
                div({className: 'value', item: displayValue})
            ]
        });
    }
});

const suggestionOption = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({spec}) {
        const {displayName, ops, example} = spec;
        return hframe({
            className: 'xh-filter-chooser-option__suggestion',
            items: [
                div('e.g.'),
                div({className: 'name', item: displayName}),
                div({className: 'operators', item: '[ ' + ops.join(', ') + ' ]'}),
                div({className: 'example', item: example})
            ]
        });
    }
});

const truncatedMessage = hoistCmp.factory({
    model: false, observer: false,
    render({truncateCount}) {
        return hframe({
            className: 'xh-filter-chooser-option__truncated',
            item: `${fmtNumber(truncateCount)} results truncated`
        });
    }
});

//-----------------
// Favorites
//------------------
function favoritesIcon(model) {
    if (!model.persistFavorites) return null;
    const isFavorite = model.isFavorite(model.value);
    return Icon.favorite({
        prefix: isFavorite ? 'fas' : 'fal',
        className: classNames(
            'xh-select__indicator',
            'xh-filter-chooser-favorite-icon',
            isFavorite ? 'xh-filter-chooser-favorite-icon--active' : null
        ),
        onClick: (e) => {
            model.openFavoritesMenu();
            e.stopPropagation();
        }
    });
}

const favoritesMenu = hoistCmp.factory({
    render({model}) {
        const options = model.favoritesOptions?.map(opt => favoriteMenuItem({...opt})),
            isFavorite = model.isFavorite(model.value);

        return menu({
            items: [
                menuItem({
                    icon: Icon.add({className: 'xh-intent-success'}),
                    text: 'Add to favorites',
                    disabled: isEmpty(model.value) || isFavorite,
                    onClick: () => model.addFavorite(model.value)
                }),
                menuDivider(),
                ...options
            ].filter(filterConsecutiveMenuSeparators())
        });
    }
});

const favoriteMenuItem = hoistCmp.factory({
    render({model, value, labels}) {
        return menuItem({
            text: hbox(labels.map(label => favoriteTag({label}))),
            className: 'xh-filter-chooser-favorite',
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

const favoriteTag = hoistCmp.factory({
    render({label}) {
        return div({
            className: 'xh-filter-chooser-favorite__tag',
            item: label
        });
    }
});