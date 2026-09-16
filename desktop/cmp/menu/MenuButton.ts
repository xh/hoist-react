/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverProps} from '@blueprintjs/core';
import {hoistCmp, type MenuContext, type MenuItemLike} from '@xh/hoist/core';
import {button, type ButtonProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {menu} from './Menu';

export interface MenuButtonProps extends ButtonProps {
    /** Items to display in the menu. */
    menuItems?: MenuItemLike[];

    /** Contextual data passed to each item's `actionFn` and `prepareFn`. */
    context?: MenuContext;

    /** Css class name for the menu element itself. */
    menuClassName?: string;

    /** Position of the menu relative to the button. Defaults to 'bottom-left'. */
    menuPosition?: PopoverProps['position'];

    /** Props passed to the internal popover. */
    popoverProps?: Partial<PopoverProps>;
}

/**
 * Button preconfigured as the trigger for a dropdown {@link Menu}.
 *
 * It takes the same {@link MenuItemLike} entries as `Menu` - item configs, `'-'` separators, and
 * {@link MenuHeading} entries. It also takes Button props directly, for its own display.
 *
 * For the app-level menu in the header, use {@link AppMenuButton}. For a right-click menu, use
 * {@link useContextMenu} or {@link PanelProps.contextMenu}.
 */
export const [MenuButton, menuButton] = hoistCmp.withFactory<MenuButtonProps>({
    displayName: 'MenuButton',
    className: 'xh-menu-button',
    model: false,

    render({
        className,
        menuItems,
        context,
        menuClassName,
        menuPosition = 'bottom-left',
        popoverProps,
        icon = Icon.menu(),
        disabled,
        ...rest
    }) {
        return popover({
            disabled,
            position: menuPosition,
            minimal: true,
            // `className` lands on the button, as `MenuButtonProps extends ButtonProps` implies.
            // Use `popoverProps.className` to target the popover wrapper instead.
            item: button({className, icon, disabled, ...rest}),
            content: menu({menuItems, context, className: menuClassName}),
            ...popoverProps
        });
    }
});
