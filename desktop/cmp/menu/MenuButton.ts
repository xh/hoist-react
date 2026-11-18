/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverBoundary, PopoverPosition} from '@xh/hoist/cmp/popover';
import {popover} from '@xh/hoist/cmp/popover';
import {
    hoistCmp,
    HoistModel,
    type MenuContext,
    type MenuItemLike,
    type Thunkable,
    useLocalModel
} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {bindable, bindableRef} from '@xh/hoist/mobx';
import {executeIfFunction, getTestId} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {menu, swallowContextMenu} from './Menu';

export interface MenuButtonProps extends ButtonProps {
    /**
     * Items to display, or a function producing them from the menu's context. As with a
     * `ContextMenuSpec`, a function is called each time the menu opens.
     */
    menuItems?: MenuItemLike[] | ((context: MenuContext) => MenuItemLike[]);

    /**
     * Contextual data passed to each item's `actionFn` and `prepareFn`, or a function producing
     * it each time the menu opens.
     */
    context?: Thunkable<MenuContext>;

    /** Css class name for the menu element itself. */
    menuClassName?: string;

    /** Position of the menu relative to the button. Defaults to 'bottom-left'. */
    menuPosition?: PopoverPosition;

    /** Options for the popover that holds the menu. */
    popoverProps?: MenuButtonPopoverProps;
}

/** Options for the popover that holds a {@link MenuButton}'s menu. */
export interface MenuButtonPopoverProps {
    /** Area the popover stays within. Default 'clippingParents'. */
    boundary?: PopoverBoundary;

    /** True to size the popover to the width of the button. */
    matchTargetWidth?: boolean;

    /** False to draw the popover with an arrow pointing at the button. Default true. */
    minimal?: boolean;

    /** Called when the popover has closed. */
    onClosed?: (node: HTMLElement) => void;

    /** Called when the popover has opened. */
    onOpened?: (node: HTMLElement) => void;

    /** CSS class name for the popover element. */
    popoverClassName?: string;

    /** Element to render the popover in, when `usePortal` is true. Default `document.body`. */
    portalContainer?: HTMLElement;

    /** False to render the popover inline, next to the button, rather than in a portal. */
    usePortal?: boolean;
}

/**
 * Button preconfigured as the trigger for a dropdown {@link Menu}.
 *
 * It takes the same {@link MenuItemLike} entries as `Menu` - item configs, `'-'` separators, and
 * {@link MenuHeading} entries. It also takes Button props directly, for its own display. A
 * `testId` lands on the button, and the open menu gets `${testId}-menu`.
 *
 * To title the whole menu, start it with a {@link MenuHeading}.
 *
 * For the app-level menu in the header, use {@link AppMenuButton}. For a right-click menu, use
 * {@link useContextMenu} or {@link PanelProps.contextMenu}.
 */
export const [MenuButton, menuButton] = hoistCmp.withFactory<MenuButtonProps>({
    displayName: 'MenuButton',
    className: 'xh-menu-button',

    render({
        className,
        menuItems,
        context,
        menuClassName,
        menuPosition = 'bottom-left',
        popoverProps,
        icon = Icon.menu(),
        disabled,
        testId,
        ...rest
    }) {
        const impl = useLocalModel(MenuButtonLocalModel);

        return popover({
            isOpen: impl.isOpen,
            onInteraction: nextOpenState => impl.setOpen(nextOpenState, menuItems, context),
            disabled,
            position: menuPosition,
            minimal: true,
            content: menu({
                menuItems: isFunction(menuItems) ? impl.menuItems : menuItems,
                context: isFunction(context) ? impl.context : context,
                className: menuClassName,
                testId: getTestId(testId, 'menu')
            }),
            ...popoverProps,
            children: button({
                className,
                icon,
                disabled,
                testId,
                onContextMenu: swallowContextMenu,
                ...rest
            })
        });
    }
});

class MenuButtonLocalModel extends HoistModel {
    override xhImpl = true;

    @bindable accessor isOpen = false;
    @bindableRef accessor menuItems: MenuItemLike[] = null;
    @bindableRef accessor context: MenuContext = null;

    setOpen(
        isOpen: boolean,
        menuItems: MenuButtonProps['menuItems'],
        context: MenuButtonProps['context']
    ) {
        if (isOpen) {
            this.context = executeIfFunction(context) ?? {};
            this.menuItems = isFunction(menuItems) ? menuItems(this.context) : null;
        }
        this.isOpen = isOpen;
    }
}
