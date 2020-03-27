import {PropTypes as PT} from 'prop-types';
import {castArray} from 'lodash';
import classNames from 'classnames';

import {hoistCmp} from '@xh/hoist/core';
import {Button, button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {MenuItem, menu, menuItem, popover} from '@xh/hoist/kit/blueprint';

// import './SplitButton.scss';


/**
 * A split button that produces a primary button and a
 * drop down menu of buttons that is opened by clicking on the down arrow icon.
 *
 * The down arrow menu trigger can be configured
 * to be on the left or right side of the primary button.
 *
 * If there are no buttons in the dropdown menu,
 * the component falls back to presenting a plain button
 * with no menu trigger.
 */
export const [SplitButton, splitButton] = hoistCmp.withFactory({
    displayName: 'SplitButton',
    model: false, memo: false, observer: false,
    className: 'xh-split-button',

    render(props) {
        const {menuItemConfs, menuTriggerSide='right', className, minimal = false, ...rest} = props,
            noMenu = !menuItemConfs || !castArray(menuItemConfs).length;
        return buttonGroup({
            className,
            items: [
                menuTriggerButton({
                    omit: noMenu || menuTriggerSide == 'right',
                    ...props,
                    minimal
                }),
                primaryButton({...rest, minimal}),
                menuTriggerButton({
                    omit: noMenu || menuTriggerSide == 'left',
                    ...props,
                    minimal
                })
            ]
        });
    }
});

const primaryButton = hoistCmp.factory({
    displayName: 'PrimaryButtonInSplitButton',
    model: false, memo: false, observer: false,

    render(props) {
        return button({
            className: 'xh-split-button__primary-button',
            ...props
        });
    }
});

const menuTriggerButton = hoistCmp.factory({
    displayName: 'MenuTriggerButtonInSplitButton',
    model: false, memo: false, observer: false,

    render({menuTriggerSide = 'right', menuItemConfs, disabled, minimal, intent, className}) {
        return popover({
            position: `bottom-${menuTriggerSide}`,
            minimal: true,
            disabled,
            target: button({
                intent,
                minimal,
                disabled,
                className: `xh-split-button__trigger--${menuTriggerSide}`,
                icon: Icon.chevronDown({prefix: 'fas'})
            }),
            content: menu({
                className: classNames(
                    className,
                    'xh-split-button__menu'
                ),
                items: castArray(menuItemConfs)
                    .map((it, idx) => menuItem({
                        className: `xh-split-button__menu__menu-item`,
                        key: idx,
                        ...it
                    }))
            })
        });
    }
});

SplitButton.propTypes = {
    /**
     * menuTriggerSide - Which side of the button does the menu trigger go on?
     * 'left'|'right'
     * defaults to 'right'
     */
    menuTriggerSide: PT.oneOf(['left', 'right']),

    /**
     * menuItemConfs - an array of menuItem confs.
     *
     * The menu items will appear in the dropdown menu.
     * If menuItemConfs is null or is undefined or if the array is empty,
     * the primaryButton is rendered alone, with no menuTrigger
     */
    menuItemConfs: PT.oneOfType([
        PT.shape(MenuItem.propTypes),
        PT.arrayOf(PT.shape(MenuItem.propTypes))
    ]),

    /**
     * Button props get passed to the primary button
     */
    ...Button.propTypes
};