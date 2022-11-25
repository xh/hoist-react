/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, useLocalModel, MenuItemLike} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {popover, PopoverProps} from '@xh/hoist/mobile/cmp/popover';
import '@xh/hoist/mobile/register';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {ReactNode} from 'react';
import {menu} from './impl/Menu';


export interface MenuButtonProps extends Omit<ButtonProps, 'title'> {

    /** Array of MenuItems or spacers. */
    menuItems?: MenuItemLike[];

    /** Position of menu relative to button */
    menuPosition?: 'top-left'|'top'|'top-right'|'right-top'|'right'|'right-bottom'|'bottom-right'|
        'bottom'|'bottom-left'|'left-bottom'|'left'|'left-top'|'auto';

    /** Optional title to display above the menu. */
    title?: ReactNode;

    /** True to disable user interaction. */
    disabled?: boolean;

    /** Props passed to the internal popover. */
    popoverProps?: Partial<PopoverProps>;
}


/**
 * Convenience Button preconfigured for use as a trigger for a dropdown menu operation.
 */
export const [MenuButton, menuButton] = hoistCmp.withFactory<MenuButtonProps>({
    displayName: 'MenuButton',
    className: 'xh-menu-button',

    render({
        menuItems,
        menuPosition = 'auto',
        title,
        disabled,
        popoverProps,
        icon = Icon.bars(),
        ...props
    }) {
        const impl = useLocalModel(MenuButtonLocalModel);

        return popover({
            isOpen: impl.isOpen,
            position: menuPosition,
            disabled: disabled,
            target: button({icon, disabled, ...props}),
            content: menu({menuItems, title, onDismiss: () => impl.isOpen = false}),
            onInteraction: (nextOpenState) => impl.isOpen = nextOpenState,
            backdrop: true,
            ...popoverProps
        });
    }
});

class MenuButtonLocalModel extends HoistModel {
    xhImpl = true;

    @bindable isOpen = false;

    constructor() {
        super();
        makeObservable(this);
    }
}
