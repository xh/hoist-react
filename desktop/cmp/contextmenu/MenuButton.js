/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {Button, button} from '@xh/hoist/desktop/cmp/button';
import {parseMenuItems} from '@xh/hoist/desktop/cmp/contextmenu/impl/ParseMenuItems';
import {Icon} from '@xh/hoist/icon';
import {menu, popover} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import PT from 'prop-types';

/**
 * Convenience Button preconfigured for use as a trigger for a dropdown menu in desktop applications
 */
export const [MenuButton, menuButton] = hoistCmp.withFactory({
    displayName: 'MenuButton',
    model: false,

    render({
        menuItems,
        menuPosition = 'auto',
        disabled,
        omitIfEmpty = true,
        popoverProps,
        icon = Icon.bars(),
        ...props
    }) {
        menuItems = parseMenuItems(menuItems);
        const content = isEmpty(menuItems) ? null : menu(menuItems);
        disabled = disabled || !content;

        if (omitIfEmpty && !content) return null;

        return popover({
            disabled,
            position: menuPosition,
            minimal: true,
            target: button({icon, disabled, ...props}),
            content,
            ...popoverProps
        });
    }
});

MenuButton.propTypes = {
    ...Button.propTypes,

    className: PT.string,

    /** Position of menu relative to button */
    menuPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ]),

    /** Optional title to display above the menu */
    title: PT.node,

    /** True to disable user interaction */
    disabled: PT.bool,

    /** True to not have an arrow pointing to the target and use a subtler animation. */
    minimal: PT.bool,

    /** True to omit the button when the menu content is empty */
    omitIfEmpty: PT.bool,

    /**
     * Array of:
     *  + `ContextMenuItems` or configs to create them.
     *  + `MenuDividers` or the special string token '-'.
     *  + React Elements or strings, which will be interpreted as the `text` property for a MenuItem.
     */
    menuItems: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.element])).isRequired
};