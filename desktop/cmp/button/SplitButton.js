import {hoistCmp} from '@xh/hoist/core';
import {Button, button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {menu, MenuItem, menuItem, popover} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {castArray} from 'lodash';
import {PropTypes as PT} from 'prop-types';
import './SplitButton.scss';

/**
 * A split button combines a primary action button with an integrated menu of secondary actions.
 */
export const [SplitButton, splitButton] = hoistCmp.withFactory({
    displayName: 'SplitButton',
    model: false, memo: false, observer: false,

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
                    menuItems, menuSide, className, disabled, intent, minimal
                }),
                primaryButton({disabled, intent, minimal, ...rest}),
                menuTriggerButton({
                    omit: noMenu || menuSide == 'left',
                    menuItems, menuSide, className, disabled, intent, minimal
                })
            ]
        });
    }
});

const primaryButton = hoistCmp.factory({
    displayName: 'SplitButtonPrimary',
    model: false, memo: false, observer: false,

    render(props) {
        return button({
            className: 'xh-split-button__primary',
            ...props
        });
    }
});

const menuTriggerButton = hoistCmp.factory({
    displayName: 'SplitButtonTrigger',
    model: false, memo: false, observer: false,

    render({menuItems, menuSide, className, disabled, intent, minimal}) {
        return popover({
            position: `bottom-${menuSide}`,
            minimal: true,
            disabled,
            target: button({
                icon: Icon.chevronDown({prefix: 'fas'}),
                className: 'xh-split-button__trigger',
                disabled,
                intent,
                minimal
            }),
            content: menu({
                className: classNames(className, 'xh-split-button__menu'),
                items: menuItems.map((it, idx) => menuItem({
                    key: idx,
                    className: classNames(it.className, 'xh-split-button__menu-item'),
                    ...it
                }))
            })
        });
    }
});

SplitButton.propTypes = {
    /** Button props to configure the primary button. */
    ...Button.propTypes,

    /**
     * Array of prop config objects for BluePrint MenuItems.
     * @see https://blueprintjs.com/docs/#core/components/menu.menu-item
     */
    menuItems: PT.oneOfType([
        PT.shape(MenuItem.propTypes),
        PT.arrayOf(PT.shape(MenuItem.propTypes))
    ]),

    /** Side on which to display the menu dropdown trigger (default right). */
    menuSide: PT.oneOf(['left', 'right'])
};