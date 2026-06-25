/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FilterChooserFilter, FilterChooserModel} from '@xh/hoist/cmp/filter';
import {box, div, hbox, hframe, vbox} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    lookup,
    useLocalModel,
    uses
} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {elemWithin, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty, isObject, sortBy} from 'lodash';
import {badge} from '@xh/hoist/cmp/badge';
import {cloneElement, ReactElement} from 'react';
import './FilterChooser.scss';

export interface FilterChooserPopoverOptions {
    /** Side of the trigger on which to expand the popover. Defaults to 'bottom'. */
    position?: 'bottom' | 'top';
    /** Width in pixels of the expanded popover - defaults to matching the trigger width. */
    width?: number;
}

export interface FilterChooserProps extends HoistProps<FilterChooserModel>, LayoutProps {
    /** True to focus the control on render. */
    autoFocus?: boolean;
    /** True to disable user interaction. */
    disabled?: boolean;
    /** True to show a "clear" button at the right of the control.  Defaults to true. */
    enableClear?: boolean;
    /** True to show count of filter tags next to the left icon. */
    displayCount?: boolean;
    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;
    /** Max-height of dropdown. Either a number in pixels or a valid CSS string, such as '80vh'. */
    maxMenuHeight?: number | string;
    /** Placement of the dropdown menu relative to the input control. */
    menuPlacement?: 'auto' | 'top' | 'bottom';
    /** Width in pixels for the dropdown menu - if unspecified, defaults to control width. */
    menuWidth?: number;
    /** Text to display when control is empty. */
    placeholder?: string;
    /** Icon clicked to launch favorites menu. (Defaults to Icon.favorite()) */
    favoritesIcon?: ReactElement;
    /**
     * True (or an options object) to render the control collapsed in-place, expanding into a
     * popover when opened. Useful within height-constrained containers such as toolbars, where
     * the chooser can then grow vertically without disrupting surrounding layout. The collapsed
     * trigger still supports single-click clearing and favorites access.
     */
    popover?: boolean | FilterChooserPopoverOptions;
}

/**
 * A Select based control for searching and choosing filters.
 * @see FilterChooserModel
 */
export const [FilterChooser, filterChooser] = hoistCmp.withFactory<FilterChooserProps>({
    model: uses(FilterChooserModel),
    className: 'xh-filter-chooser',
    render({model, className, ...props}, ref) {
        return props.popover
            ? popoverFilterChooser({model, className, ...props, ref})
            : filterChooserControl({model, className, ...props, ref});
    }
});

//------------------
// Implementation
//------------------
interface FilterChooserControlProps extends FilterChooserProps {
    /** Internal - false to render a non-interactive display (the collapsed popover trigger). */
    xhInteractive?: boolean;
    /** Internal - override for the favorites menu open state. */
    xhFavoritesOpen?: boolean;
}

/**
 * The Select-based control shared by the inline FilterChooser and both faces (collapsed trigger and
 * expanded content) of the popover variant. Only the interactive instance binds `model.inputRef`,
 * so the popover can mount trigger and content simultaneously without contention.
 */
const filterChooserControl = hoistCmp.factory<FilterChooserControlProps>({
    model: uses(FilterChooserModel),
    render({model, className, ...props}, ref) {
        const [layoutProps, chooserProps] = splitLayoutProps(props),
            {
                inputRef,
                suggestFieldsWhenEmpty,
                selectOptions,
                unsupportedFilter,
                favoritesIsOpen,
                tagCount
            } = model,
            {
                autoFocus,
                enableClear,
                displayCount,
                leftIcon,
                maxMenuHeight,
                menuPlacement,
                menuWidth,
                favoritesIcon,
                xhInteractive = true,
                xhFavoritesOpen
            } = chooserProps,
            disabled = unsupportedFilter || chooserProps.disabled,
            placeholder = unsupportedFilter
                ? 'Unsupported filter (click to clear)'
                : withDefault(chooserProps.placeholder, 'Filter...');

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                item: hframe(
                    badge({
                        omit: !displayCount || tagCount < 1,
                        className: 'xh-filter-chooser__count',
                        item: tagCount
                    }),
                    select({
                        flex: 1,
                        height: layoutProps?.height,
                        bind: 'selectValue',
                        // Only the interactive instance owns the shared inputRef.
                        ref: xhInteractive ? inputRef : undefined,

                        autoFocus,
                        disabled,
                        menuPlacement,
                        menuWidth,
                        placeholder,
                        leftIcon: withDefault(leftIcon, Icon.filter()),
                        enableClear: withDefault(enableClear, true),

                        enableMulti: true,
                        queryFn: q => model.queryAsync(q),
                        options: selectOptions,
                        optionRenderer,
                        rsOptions: {
                            defaultOptions: suggestFieldsWhenEmpty,
                            openMenuOnClick: suggestFieldsWhenEmpty,
                            openMenuOnFocus: false,
                            isOptionDisabled: opt => opt.type === 'msg',
                            noOptionsMessage: () => null,
                            loadingMessage: () => null,
                            styles: {
                                menuList: base => ({
                                    ...base,
                                    maxHeight: withDefault(maxMenuHeight, '50vh')
                                })
                            },
                            components: {
                                DropdownIndicator: () => favoritesIconCmp(model, favoritesIcon)
                            },
                            // Display-only trigger: suppress menu + typing, but leave clear and
                            // favorites affordances live for single-click access.
                            ...(xhInteractive ? {} : {menuIsOpen: false, isSearchable: false})
                        }
                    })
                ),
                content: favoritesMenu(),
                isOpen: xhFavoritesOpen ?? favoritesIsOpen,
                position: 'bottom-right',
                minimal: true,
                onInteraction: willOpen => {
                    if (!willOpen) model.closeFavoritesMenu();
                    if (unsupportedFilter) model.setValue(null);
                }
            })
        });
    }
});

/**
 * Wraps a FilterChooser so it renders collapsed in-place and expands into a popover when opened,
 * allowing it to grow vertically beyond the height of a toolbar. The collapsed trigger always
 * occupies its space (so surrounding layout never shifts) and routes single clicks on its clear
 * and favorites controls directly, rather than first opening the popover.
 */
const popoverFilterChooser = hoistCmp.factory<FilterChooserProps>({
    model: uses(FilterChooserModel),
    render({model, className, ...props}, ref) {
        const impl = useLocalModel(FilterChooserLocalModel),
            {popoverIsOpen} = impl,
            {popover: popoverSpec, ...rest} = props,
            opts = isObject(popoverSpec) ? popoverSpec : {},
            layoutProps = getLayoutProps(rest);

        return box({
            ref,
            className: classNames(className, 'xh-filter-chooser--popover'),
            ...layoutProps,
            item: popover({
                isOpen: popoverIsOpen,
                popoverClassName: 'xh-filter-chooser__popover',
                matchTargetWidth: true,
                minimal: true,
                position: opts.position ?? 'bottom',
                item: filterChooserControl({
                    model,
                    flex: 1,
                    className: 'xh-filter-chooser__trigger',
                    ...rest,
                    displayCount: true,
                    xhInteractive: false,
                    // Trigger hosts the favorites menu only while collapsed; once open, the
                    // expanded content takes over.
                    xhFavoritesOpen: model.favoritesIsOpen && !popoverIsOpen
                }),
                content: filterChooserControl({
                    model,
                    flex: 1,
                    width: opts.width,
                    className: 'xh-filter-chooser__content',
                    ...rest,
                    displayCount: true
                }),
                onInteraction: (willOpen, e) => {
                    if (willOpen) {
                        // Let clicks on the inline clear / favorites controls act directly.
                        const target = e?.target as HTMLElement;
                        if (
                            target &&
                            (elemWithin(target, 'xh-select__clear-indicator') ||
                                elemWithin(target, 'xh-filter-chooser-favorite-icon'))
                        ) {
                            return;
                        }
                        impl.open();
                    } else {
                        impl.close();
                    }
                }
            })
        });
    }
});

class FilterChooserLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(FilterChooserModel)
    model: FilterChooserModel;

    @bindable
    popoverIsOpen: boolean = false;

    constructor() {
        super();
        makeObservable(this);
    }

    open() {
        this.popoverIsOpen = true;

        // Focus the (now-mounted) interactive input and open its menu once available.
        this.addReaction({
            when: () => !!this.model.inputRef.current,
            run: () => {
                const inputRef = this.model.inputRef.current;
                inputRef.focus();
                (inputRef as any).reactSelectRef.current?.openMenu('first');
            }
        });
    }

    close() {
        this.popoverIsOpen = false;
    }
}

//-----------------
// Options
//------------------
function optionRenderer(opt) {
    switch (opt.type) {
        case 'field':
            return fieldOption(opt);
        case 'minimalField':
            return minimalFieldOption(opt);
        case 'filter':
            return filterOption(opt);
        case 'msg':
            return messageOption(opt);
    }
    return null;
}

const fieldOption = hoistCmp.factory({
    model: false,
    observer: false,
    memo: false,
    render({fieldSpec}) {
        const {displayName, ops, example} = fieldSpec,
            displayOps = [...ops, 'is']; // Always include the 'is' pseudo-operator so users know to try to use it.
        return hframe({
            className: 'xh-filter-chooser-option__field',
            items: [
                div({className: 'prefix', item: 'e.g.'}),
                div({className: 'name', item: displayName}),
                div({className: 'operators', item: '[ ' + displayOps.join(', ') + ' ]'}),
                div({className: 'example', item: example})
            ]
        });
    }
});

const minimalFieldOption = hoistCmp.factory({
    model: false,
    observer: false,
    memo: false,
    render({fieldSpec}) {
        const {displayName} = fieldSpec;
        return hframe({
            className: 'xh-filter-chooser-option__minimal-field',
            item: displayName
        });
    }
});

const filterOption = hoistCmp.factory({
    model: false,
    observer: false,
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
    model: false,
    observer: false,
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
function favoritesIconCmp(model, favoritesIcon) {
    if (!model.persistFavorites) return null;

    const iconProps = {
        className: classNames('xh-select__indicator', 'xh-filter-chooser-favorite-icon'),
        onMouseDown: e => {
            model.openFavoritesMenu();
            e.stopPropagation();
        }
    };

    return favoritesIcon ? cloneElement(favoritesIcon, iconProps) : Icon.favorite(iconProps);
}

const favoritesMenu = hoistCmp.factory<FilterChooserModel>({
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
                icon: Icon.add({intent: 'success'}),
                text: 'Add current',
                omit: omitAdd,
                onClick: () => model.addFavorite(model.value)
            })
        );

        return vbox(div({className: 'xh-popup__title', item: 'Favorites'}), menu({items}));
    }
});

const favoriteMenuItem = hoistCmp.factory<
    HoistProps<FilterChooserModel> & {value: FilterChooserFilter; labels: string[]}
>({
    render({model, value, labels}) {
        return menuItem({
            text: hbox(labels.map(label => favoriteTag({label}))),
            className: 'xh-filter-chooser-favorite',
            onClick: () => model.setValue(value),
            labelElement: button({
                icon: Icon.delete(),
                onClick: e => {
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

function getFavoritesOptions(model: FilterChooserModel) {
    const ret = model.favoritesOptions.map(f => {
        const labels = f.filterOptions.map(option => option.label);
        return {value: f.value, labels};
    });

    return sortBy(ret, it => it.labels[0]);
}
