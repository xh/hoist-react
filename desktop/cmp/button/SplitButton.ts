import {hoistCmp, MenuItemLike} from '@xh/hoist/core';
import {button, buttonGroup, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import classNames from 'classnames';
import {castArray} from 'lodash';
import './SplitButton.scss';

/**
 * A split button combines a primary action button with an integrated menu of secondary actions.
 */

export interface SplitButtonProps extends ButtonProps {
    menuItems: MenuItemLike[];
    menuSide?: 'left' | 'right';
}
export const [SplitButton, splitButton] = hoistCmp.withFactory<SplitButtonProps>({
    displayName: 'SplitButton',
    model: false,
    memo: false,
    observer: false,

    render({
        menuItems = [],
        menuSide = 'right',
        disabled,
        intent,
        minimal = false,
        className,
        ...rest
    }) {
        menuItems = castArray(menuItems);
        const noMenu = !menuItems.length;

        return buttonGroup({
            className: classNames(className, 'xh-split-button'),
            items: [
                menuTriggerButton({
                    omit: noMenu || menuSide == 'right',
                    menuItems,
                    menuSide,
                    className,
                    disabled,
                    intent,
                    minimal
                }),
                primaryButton({disabled, intent, minimal, ...rest}),
                menuTriggerButton({
                    omit: noMenu || menuSide == 'left',
                    menuItems,
                    menuSide,
                    className,
                    disabled,
                    intent,
                    minimal
                })
            ]
        });
    }
});

const primaryButton = hoistCmp.factory<ButtonProps>({
    displayName: 'SplitButtonPrimary',
    model: false,
    memo: false,
    observer: false,

    render(props) {
        return button({
            className: 'xh-split-button__primary',
            ...props
        });
    }
});

const menuTriggerButton = hoistCmp.factory({
    displayName: 'SplitButtonTrigger',
    model: false,
    memo: false,
    observer: false,

    render({menuItems, menuSide, className, disabled, intent, minimal}) {
        return popover({
            position: `bottom-${menuSide}`,
            minimal: true,
            disabled,
            target: button({
                icon: Icon.chevronDown({prefix: 'fas'}),
                className: `xh-split-button__trigger-${menuSide}`,
                disabled,
                intent,
                minimal
            }),
            content: menu({
                className: classNames(className, 'xh-split-button__menu'),
                items: menuItems.map((item, idx) => {
                    const {actionFn, ...rest} = item;

                    return menuItem({
                        key: idx,
                        className: classNames(item.className, 'xh-split-button__menu-item'),
                        onClick: actionFn ? () => wait().then(actionFn) : null, // do async to allow menu to close
                        ...rest
                    });
                })
            })
        });
    }
});
