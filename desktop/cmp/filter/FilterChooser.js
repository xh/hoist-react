/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {box, div, hbox, hframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Select, select} from '@xh/hoist/desktop/cmp/input';
import {fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty, sortBy} from 'lodash';

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
    if (opt.value === FilterChooserModel.TRUNCATED) return truncatedMessage(opt);
    if (opt.op) return filterOption(opt);
    if (opt.ops) return suggestionOption(opt);
    return null;
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
    render({displayName, ops, example}) {
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
        prefix: isFavorite ? 'fas' : 'far',
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
        const options = getFavoritesOptions(model),
            isFavorite = model.isFavorite(model.value),
            addDisabled = isEmpty(model.value) || isFavorite,
            items = [];

        if (isEmpty(options)) {
            items.push(menuItem({text: 'You have not yet saved any favorites...', disabled: true}));
        } else {
            items.push(...options.map(it => favoriteMenuItem(it)));
        }

        items.push(
            menuDivider(),
            menuItem({
                icon: Icon.add({className: addDisabled ? '' : 'xh-intent-success'}),
                text: 'Add current filter to favorites',
                disabled: addDisabled,
                onClick: () => model.addFavorite(model.value)
            })
        );

        return menu({items});
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

function getFavoritesOptions(model) {
    const ret = model.favoritesOptions.map(f => {
        const labels = f.filterOptions.map(option => option.label);
        return {value: f.value, labels};
    });

    return sortBy(ret, it => it.labels[0]);
}