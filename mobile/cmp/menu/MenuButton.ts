/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, useLocalModel, MenuItem} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {popover} from '@xh/hoist/mobile/cmp/popover';
import '@xh/hoist/mobile/register';
import {observable, action, makeObservable} from '@xh/hoist/mobx';
import {menu} from './impl/Menu';
import {ButtonProps} from "@xh/hoist/desktop/cmp/button";
import {ReactNode} from 'react';


export interface MenuButtonProps extends ButtonProps {

    /** Array of MenuItems to display. */
    menuItems?: (MenuItem|ReactNode)[];

    /** Position of menu relative to button */
    menuPosition: 'top-left'|'top'|'top-right'|'right-top'|'right'|'right-bottom'|'bottom-right'|'bottom'|
        'bottom-left'|'left-bottom'|'left'|'left-top'|'auto';

    /** Optional title to display above the menu */
    title: ReactNode;

    /** True to disable user interaction */
    disabled: boolean;

    /** Props passed to the internal popover */
    popoverProps: Record<string, any>;
};

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
        const impl = useLocalModel(MenuButtonModel);

        return popover({
            isOpen: impl.isOpen,
            position: menuPosition,
            disabled: disabled,
            target: button({icon, disabled, ...props}),
            content: menu({menuItems, title, onDismiss: () => impl.setIsOpen(false)}),
            onInteraction: (nextOpenState) => impl.setIsOpen(nextOpenState),
            backdrop: true,
            ...popoverProps
        });
    }
});

class MenuButtonModel extends HoistModel {
    xhImpl = true;

    @observable isOpen = false;
    @action setIsOpen(v: boolean) {this.isOpen = v}

    constructor() {
        super();
        makeObservable(this);
    }
}
