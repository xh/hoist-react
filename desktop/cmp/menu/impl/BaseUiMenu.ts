/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, span} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    type HoistProps,
    isMenuHeading,
    isMenuItem,
    type MenuContext,
    type MenuHeading,
    type MenuItem,
    type MenuToken
} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button/Button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {
    type Menu,
    menuClear,
    menuEmpty,
    menuFilterProvider,
    menuGroup,
    menuGroupLabel,
    menuInput,
    menuItem,
    menuList,
    menuPopup,
    menuPortal,
    menuPositioner,
    menuRoot,
    menuSeparator,
    menuSubmenuRoot,
    menuSubmenuTrigger,
    menuTrigger,
    useMenuFilter
} from '@xh/hoist/kit/base-ui';
import {wait} from '@xh/hoist/promise';
import {executeIfFunction, TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {compact, isEmpty, isString, last} from 'lodash';
import {type ReactElement, type ReactNode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {swallowContextMenu} from '../Menu';
import {prepareMenuItems} from './MenuItems';
import './BaseUiMenu.scss';

// Menus rendered with Base UI, which adds keyboard navigation and an optional filter to Hoist's
// menu configs. Hoist's own `Menu`, `MenuButton` and `ContextMenu` render with Blueprint - this
// trial covers only the menus of `DashContainer` and `DashCanvas`, for their add view filters.

/**
 * A menu item config for a Base UI menu - a {@link MenuItem}, which can also filter its submenu.
 * @internal
 */
export interface BaseUiMenuItem extends MenuItem {
    /**
     * True to show a filter input atop this item's submenu. A query lists every matching item
     * within the submenu - including those of its nested submenus, with their path - as one list.
     */
    filterable?: boolean;

    items?: BaseUiMenuItemLike[];
}

/** @internal */
export type BaseUiMenuItemLike = BaseUiMenuItem | MenuHeading | MenuToken | ReactElement;

/** @internal */
export interface BaseUiMenuOptions {
    /** Contextual data passed to each item's `actionFn` and `prepareFn`. */
    context?: MenuContext;

    /** True to show a filter input atop the menu - see {@link BaseUiMenuItem.filterable}. */
    filterable?: boolean;
}

/** @internal */
export interface BaseUiMenuButtonProps extends ButtonProps, BaseUiMenuOptions {
    /** Items to display, or a function producing them each time the menu opens. */
    menuItems: BaseUiMenuItemLike[] | (() => BaseUiMenuItemLike[]);

    /** Side of the button to show the menu on. Default 'bottom'. */
    menuSide?: Menu.Positioner.Props['side'];

    /** Alignment of the menu against that side. Default 'start'. */
    menuAlign?: Menu.Positioner.Props['align'];
}

/**
 * Button that opens a Base UI menu.
 * @internal
 */
export const baseUiMenuButton = hoistCmp.factory<BaseUiMenuButtonProps>({
    displayName: 'BaseUiMenuButton',
    model: false,
    observer: false,

    render(
        {
            menuItems,
            context,
            filterable,
            menuSide = 'bottom',
            menuAlign = 'start',
            disabled,
            ...rest
        },
        ref
    ) {
        const {query, withFilter} = useFilterQuery(filterable);
        return withFilter(
            menuRoot({
                modal: false,
                items: [
                    menuTrigger({disabled, render: button({ref, disabled, ...rest})}),
                    popupLayer(
                        {side: menuSide, align: menuAlign, sideOffset: 4},
                        {menuItems, context, filterable, query}
                    )
                ]
            })
        );
    }
});

/**
 * Show a Base UI menu at a point on the page - e.g. at the cursor, for a context menu.
 * @internal
 */
export function showBaseUiContextMenu(
    menuItems: BaseUiMenuItemLike[],
    offset: {left: number; top: number},
    opts: BaseUiMenuOptions = {}
) {
    const containerEl = document.createElement('div'),
        root = createRoot(containerEl),
        onClosed = () =>
            wait().then(() => {
                root.unmount();
                containerEl.remove();
            });

    document.body.appendChild(containerEl);
    root.render(contextMenuRoot({menuItems, offset, onClosed, ...opts}));
}

//------------------------
// Implementation
//------------------------
const contextMenuRoot = hoistCmp.factory({
    displayName: 'BaseUiContextMenu',
    model: false,
    observer: false,

    render({menuItems, offset, context, filterable, onClosed}) {
        const [open, setOpen] = useState(true),
            [anchor] = useState(() => pointAnchor(offset)),
            {query, withFilter} = useFilterQuery(filterable);

        return withFilter(
            menuRoot({
                open,
                modal: false,
                onOpenChange: setOpen,
                onOpenChangeComplete: isOpen => {
                    if (!isOpen) onClosed();
                },
                item: popupLayer(
                    {anchor, side: 'bottom', align: 'start'},
                    {menuItems, context, filterable, query}
                )
            })
        );
    }
});

interface SubmenuProps extends HoistProps {
    /** Config of the item that opens the submenu. */
    config: BaseUiMenuItem;
    context: MenuContext;
    hasIcons: boolean;
}

const submenu = hoistCmp.factory<SubmenuProps>({
    displayName: 'BaseUiSubmenu',
    model: false,
    observer: false,

    render({config, context, hasIcons}) {
        const {filterable, items, disabled, actionFn} = config,
            {query, withFilter} = useFilterQuery(filterable);

        return withFilter(
            menuSubmenuRoot(
                menuSubmenuTrigger({
                    className: getItemClassName(config),
                    label: getLabel(config),
                    disabled,
                    onClick: actionFn ? e => wait().then(() => actionFn(e, context)) : null,
                    [TEST_ID]: config.testId,
                    items: itemContent(
                        config,
                        hasIcons,
                        Icon.caretRight({className: 'xh-base-ui-menu__caret'})
                    )
                }),
                popupLayer(
                    {sideOffset: -2, alignOffset: -5},
                    {menuItems: items, context, filterable, query}
                )
            )
        );
    }
});

interface PopupProps extends HoistProps, BaseUiMenuOptions {
    menuItems: BaseUiMenuItemLike[] | (() => BaseUiMenuItemLike[]);

    /** The filter query, when filterable. */
    query: string;
}

/**
 * The popup of a menu or submenu. Base UI renders a closed popup's portal empty, so its items are
 * prepared - and their `prepareFn` run - only while it is open. As an observer, it prepares them
 * again when the observable state they read changes.
 */
const popup = hoistCmp.factory<PopupProps>({
    displayName: 'BaseUiMenuPopup',
    model: false,

    render({menuItems, context, filterable, query}) {
        const items = prepareMenuItems(executeIfFunction(menuItems), context),
            {contains} = useMenuFilter(),
            trimmedQuery = query?.trim();

        return menuPopup({
            className: 'xh-base-ui-menu',
            onContextMenu: swallowContextMenu,
            items: [
                filterable ? filterBar() : null,
                filterable
                    ? menuEmpty({className: 'xh-base-ui-menu__empty', item: 'No matches'})
                    : null,
                menuList({
                    className: 'xh-base-ui-menu__list',
                    items: trimmedQuery
                        ? renderMatches(
                              findMatches(items, context, text => contains(text, trimmedQuery)),
                              context
                          )
                        : renderItems(items, context)
                })
            ]
        });
    }
});

function popupLayer(positionerProps: Menu.Positioner.Props, popupProps: PopupProps) {
    return menuPortal(
        menuPositioner({
            className: 'xh-base-ui-menu-positioner',
            ...positionerProps,
            item: popup(popupProps)
        })
    );
}

function filterBar() {
    return div({
        className: 'xh-base-ui-menu__filter',
        items: [
            Icon.search({className: 'xh-base-ui-menu__filter-icon'}),
            menuInput({
                className: 'xh-base-ui-menu__filter-input',
                placeholder: 'Filter...',
                'aria-label': 'Filter menu items'
            }),
            menuClear({
                className: 'xh-base-ui-menu__filter-clear',
                'aria-label': 'Clear filter',
                item: Icon.x()
            })
        ]
    });
}

/**
 * Keeps the filter query for a filterable menu or submenu. Base UI's filter holds the query, and
 * Hoist matches items itself, to search nested submenus too.
 */
function useFilterQuery(filterable: boolean) {
    const [query, setQuery] = useState('');
    return {
        query,
        withFilter: (root: ReactElement) =>
            filterable
                ? menuFilterProvider({
                      filter: null,
                      autoHighlight: true,
                      value: query,
                      onValueChange: setQuery,
                      item: root
                  })
                : root
    };
}

//------------------------
// Items
//------------------------
/** Render prepared items, nesting each heading with the items below it in a labelled group. */
function renderItems(items: BaseUiMenuItemLike[], context: MenuContext): ReactNode[] {
    const hasIcons = items.some(it => isMenuItem(it) && it.icon),
        sections: {heading: MenuHeading; nodes: ReactNode[]}[] = [{heading: null, nodes: []}];

    items.forEach(item => {
        if (isMenuHeading(item)) {
            sections.push({heading: item, nodes: []});
        } else {
            last(sections).nodes.push(renderItem(item, context, hasIcons));
        }
    });

    return sections.flatMap(({heading, nodes}) =>
        heading
            ? menuGroup(
                  menuGroupLabel({
                      className: classNames('xh-base-ui-menu__heading', heading.className),
                      item: heading.heading
                  }),
                  ...nodes
              )
            : nodes
    );
}

function renderItem(
    item: Exclude<BaseUiMenuItemLike, MenuHeading>,
    context: MenuContext,
    hasIcons: boolean
): ReactNode {
    if (item === '-') return menuSeparator({className: 'xh-base-ui-menu__separator'});
    if (!isMenuItem(item)) return item;
    if (!isEmpty(item.items)) return submenu({config: item, context, hasIcons});
    return leafItem(item, context, hasIcons);
}

function leafItem(item: BaseUiMenuItem, context: MenuContext, hasIcons: boolean, path?: string) {
    const {actionFn} = item;
    return menuItem({
        className: getItemClassName(item),
        label: getLabel(item),
        disabled: item.disabled,
        closeOnClick: !item.keepMenuOpen,
        // Run async, to let the menu close first.
        onClick: actionFn ? e => wait().then(() => actionFn(e, context)) : null,
        [TEST_ID]: item.testId,
        items: itemContent(
            item,
            hasIcons,
            path ? span({className: 'xh-base-ui-menu__path', item: path}) : null
        )
    });
}

function itemContent(item: BaseUiMenuItem, hasIcons: boolean, trailing: ReactNode): ReactNode[] {
    return [
        hasIcons ? span({className: 'xh-base-ui-menu__icon', item: item.icon}) : null,
        span({className: 'xh-base-ui-menu__text', item: item.text}),
        trailing
    ];
}

function getItemClassName({intent, active, className}: BaseUiMenuItem) {
    return classNames(
        'xh-base-ui-menu__item',
        intent ? `xh-base-ui-menu__item--${intent}` : null,
        active ? 'xh-base-ui-menu__item--active' : null,
        className
    );
}

/** Text for Base UI's keyboard typeahead, when the item text is not a string. */
function getLabel({text}: BaseUiMenuItem): string {
    return isString(text) ? text : undefined;
}

//------------------------
// Filter matches
//------------------------
interface MenuMatch {
    item: BaseUiMenuItem;

    /** Text of the submenus holding the item, outermost first. */
    path: string[];
}

/**
 * Find the items that match a query, searching nested submenus too. Matches each item on its own
 * text together with the text of the submenus holding it, so a query for a submenu lists all of
 * its items.
 */
function findMatches(
    items: BaseUiMenuItemLike[],
    context: MenuContext,
    isMatch: (text: string) => boolean,
    path: string[] = []
): MenuMatch[] {
    return items.flatMap(item => {
        if (!isMenuItem(item)) return [];

        const itemPath = compact([...path, getLabel(item)]);
        if (isEmpty(item.items)) {
            return isMatch(itemPath.join(' ')) ? [{item, path}] : [];
        }
        return item.disabled
            ? []
            : findMatches(prepareMenuItems(item.items, context), context, isMatch, itemPath);
    });
}

function renderMatches(matches: MenuMatch[], context: MenuContext): ReactNode[] {
    const hasIcons = matches.some(it => it.item.icon);
    return matches.map(({item, path}) => leafItem(item, context, hasIcons, path.join(' › ')));
}

/** An anchor for the Base UI positioner, at a point within the viewport. */
function pointAnchor({left, top}: {left: number; top: number}) {
    return {getBoundingClientRect: () => new DOMRect(left, top, 0, 0)};
}
