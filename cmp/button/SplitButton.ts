/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PopoverPosition} from '@xh/hoist/cmp/popover';
import type {MenuContext, MenuItemLike, Thunkable} from '@xh/hoist/core';
import {hoistCmp, XH} from '@xh/hoist/core';
import {menuButtonImpl as desktopMenuButtonImpl} from '@xh/hoist/dynamics/desktop';
import {menuButtonImpl as mobileMenuButtonImpl} from '@xh/hoist/dynamics/mobile';
import {Icon} from '@xh/hoist/icon';
import {getTestId} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isString} from 'lodash';
import type {ButtonProps} from './Button';
import {button} from './Button';
import {buttonGroup} from './ButtonGroup';
import './Button.scss';

export interface SplitButtonProps extends ButtonProps {
    /**
     * Items for the menu - other actions related to the button's own. A function is called each
     * time the menu opens, with the menu's context.
     */
    menuItems: MenuItemLike[] | ((context: MenuContext) => MenuItemLike[]);

    /**
     * Contextual data passed to each item's `actionFn` and `prepareFn`, or a function producing
     * it each time the menu opens.
     */
    context?: Thunkable<MenuContext>;

    /** CSS class name for the menu element. */
    menuClassName?: string;

    /** Position of the menu relative to the arrow button. Default 'bottom-right' on desktop. */
    menuPosition?: PopoverPosition;

    /**
     * Props for the arrow button that opens the menu, such as its `icon`, `disabled` or
     * `aria-label`. Its accessible name defaults to "More [text] options".
     */
    menuButtonProps?: Partial<ButtonProps>;
}

/**
 * A button for a primary action, joined to an arrow button that opens a menu of related actions -
 * for example "Save", with "Save As..." and "Save a Copy" in its menu.
 *
 * Each part is its own button, with its own tab stop. Props for a Button, such as `text`, `icon`,
 * `onClick` and `loading`, apply to the primary button. `intent`, `minimal`, `outlined`, `size`
 * and `disabled` apply to both. Desktop and mobile.
 */
export const [SplitButton, splitButton] = hoistCmp.withFactory<SplitButtonProps>({
    displayName: 'SplitButton',
    model: false,
    className: 'xh-split-button',

    render(props, ref) {
        const [
            layoutProps,
            {
                className,
                menuItems,
                context,
                menuClassName,
                menuPosition,
                menuButtonProps,
                intent,
                minimal,
                outlined,
                size,
                disabled,
                testId,
                ...rest
            }
        ] = splitLayoutProps(props);

        const isMobile = XH.isMobileApp,
            styleProps = {intent, minimal, outlined, disabled},
            menuButtonImpl = isMobile ? mobileMenuButtonImpl : desktopMenuButtonImpl,
            label = isString(rest.text) ? `More ${rest.text} options` : 'More options';

        return buttonGroup({
            ref,
            className,
            intent,
            minimal,
            outlined,
            size,
            testId,
            ...layoutProps,
            children: [
                button({
                    ...styleProps,
                    ...rest,
                    className: 'xh-split-button__button',
                    testId: getTestId(testId, 'button')
                }),
                menuButtonImpl({
                    ...styleProps,
                    icon: Icon.chevronDown(),
                    menuItems,
                    context,
                    menuClassName,
                    menuPosition: menuPosition ?? (isMobile ? undefined : 'bottom-right'),
                    'aria-label': label,
                    testId: getTestId(testId, 'menu-button'),
                    ...menuButtonProps,
                    className: classNames(
                        'xh-split-button__menu-button',
                        menuButtonProps?.className
                    )
                })
            ]
        });
    }
});
