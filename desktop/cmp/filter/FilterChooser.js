/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {box, div, hbox, vbox, hframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {withDefault} from '@xh/hoist/utils/js';
import {isEmpty, sortBy} from 'lodash';
import classNames from 'classnames';
import PT from 'prop-types';

import './FilterChooser.scss';

/**
 * A Select based control for searching and choosing filters.
 * @see FilterChooserModel
 */
export const [FilterChooser, filterChooser] = hoistCmp.withFactory({
    model: uses(FilterChooserModel),
    className: 'xh-filter-chooser',
    render({model, className, ...props}, ref) {
        const [layoutProps, chooserProps] = splitLayoutProps(props),
            {inputRef, selectOptions, unsupportedFilter, favoritesIsOpen} = model,
            {autoFocus, enableClear, leftIcon, maxMenuHeight, menuPlacement} = chooserProps,
            disabled = unsupportedFilter || chooserProps.disabled,
            placeholder = unsupportedFilter ?
                'Unsupported filter' : // Todo: How to message this better?
                withDefault(chooserProps.placeholder, 'Filter...');

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                item: select({
                    flex: 1,
                    height: layoutProps?.height,
                    bind: 'selectValue',
                    ref: inputRef,

                    autoFocus,
                    disabled,
                    menuPlacement,
                    placeholder,
                    leftIcon: withDefault(leftIcon, Icon.filter()),
                    enableClear: withDefault(enableClear, true),

                    enableMulti: true,
                    queryFn: (q) => model.queryAsync(q),
                    options: selectOptions,
                    optionRenderer,
                    rsOptions: {
                        defaultOptions: false,
                        openMenuOnClick: false,
                        openMenuOnFocus: false,
                        isOptionDisabled: (opt) => opt.type === 'msg',
                        noOptionsMessage: () => null,
                        loadingMessage: () => null,
                        styles: {
                            menuList: (base) => ({
                                ...base,
                                maxHeight: withDefault(maxMenuHeight, '50vh')
                            })
                        },
                        components: {
                            DropdownIndicator: () => favoritesIcon(model)
                        }
                    }
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
    /** True to focus the control on render. */
    autoFocus: PT.bool,

    /** True to disable user interaction. */
    disabled: PT.bool,

    /** True to show a "clear" button at the right of the control.  Defaults to true. */
    enableClear: PT.bool,

    /** Icon to display inline on the left side of the input. */
    leftIcon: PT.element,

    /** Max-height of dropdown. Either a number in pixels or a valid CSS string, such as '80vh'. */
    maxMenuHeight: PT.oneOfType([PT.number, PT.string]),

    /** Placement of the dropdown menu relative to the input control. */
    menuPlacement: PT.oneOf(['auto', 'top', 'bottom']),

    /** Text to display when control is empty. */
    placeholder: PT.string
};


//-----------------
// Options
//------------------
function optionRenderer(opt) {
    switch (opt.type) {
        case 'field' : return fieldOption(opt);
        case 'filter': return filterOption(opt);
        case 'msg': return messageOption(opt);
    }
    return null;
}

const fieldOption = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({fieldSpec}) {
        const {displayName, ops, example} = fieldSpec;
        return hframe({
            className: 'xh-filter-chooser-option__field',
            items: [
                div('e.g.'),
                div({className: 'name', item: displayName}),
                div({className: 'operators', item: '[ ' + ops.join(', ') + ' ]'}),
                div({className: 'example', item: example})
            ]
        });
    }
});

const filterOption = hoistCmp.factory({
    model: false, observer: false,
    render({fieldSpec, displayOp, displayValue}) {
        return hframe({
            className: 'xh-filter-chooser-option',
            items: [
                div({className: 'name', item: fieldSpec.displayName}),
                div({className: 'operator', item: displayOp}),
                div({className: 'value', item: displayValue})
            ]
        });
    }
});

const messageOption = hoistCmp.factory({
    model: false, observer: false,
    render({label}) {
        return hframe({
            className: 'xh-filter-chooser-option__message',
            item: label
        });
    }
});

//-----------------
// Favorites
//------------------
function favoritesIcon(model) {
    if (!model.persistFavorites) return null;
    return Icon.favorite({
        className: classNames(
            'xh-select__indicator',
            'xh-filter-chooser-favorite-icon'
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
            omitAdd = isEmpty(model.value) || isFavorite,
            items = [];

        if (isEmpty(options)) {
            items.push(menuItem({text: 'No favorites saved...', disabled: true}));
        } else {
            items.push(...options.map(it => favoriteMenuItem(it)));
        }

        items.push(
            menuDivider({omit: omitAdd}),
            menuItem({
                icon: Icon.add({className: 'xh-intent-success'}),
                text: 'Add current',
                omit: omitAdd,
                onClick: () => model.addFavorite(model.value)
            })
        );

        return vbox(
            div({className: 'xh-popup__title', item: 'Favorites'}),
            menu({items})
        );
    }
});

const favoriteMenuItem = hoistCmp.factory({
    render({model, value, labels}) {
        return menuItem({
            text: hbox(labels.map(label => favoriteTag({label}))),
            className: 'xh-filter-chooser-favorite',
            onClick: () => model.setValue(value),
            labelElement: button({
                icon: Icon.delete(),
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
