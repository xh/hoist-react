/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverProps} from '@blueprintjs/core';
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
import {popover} from '@xh/hoist/kit/blueprint';
import {bindable, bindableRef} from '@xh/hoist/mobx';
import {executeIfFunction} from '@xh/hoist/utils/js';
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
        const impl = useLocalModel(MenuButtonLocalModel);

        return popover({
            isOpen: impl.isOpen,
            onInteraction: nextOpenState => impl.setOpen(nextOpenState, menuItems, context),
            disabled,
            position: menuPosition,
            minimal: true,
            item: button({className, icon, disabled, onContextMenu: swallowContextMenu, ...rest}),
            content: menu({
                menuItems: isFunction(menuItems) ? impl.menuItems : menuItems,
                context: isFunction(context) ? impl.context : context,
                className: menuClassName
            }),
            ...popoverProps
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
