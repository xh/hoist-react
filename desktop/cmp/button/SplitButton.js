import {PropTypes as PT} from 'prop-types';
import {castArray} from 'lodash';

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
    model: false,
    className: 'xh-split-button',

    render(props) {
        const {menuItemConfs, menuTriggerSide='right', className, ...rest} = props,
            noMenu = !menuItemConfs || !castArray(menuItemConfs).length;
        return buttonGroup({
            className,
            items: [
                menuTriggerButton({
                    omit: noMenu || menuTriggerSide == 'right',
                    ...props
                }),
                primaryButton(rest),
                menuTriggerButton({
                    omit: noMenu || menuTriggerSide == 'left',
                    ...props
                })
            ]
        });
    }
});

const primaryButton = hoistCmp.factory({
    displayName: 'PrimaryButtonInSplitButton',
    model: false,

    render(props) {
        return button({
            className: 'xh-split-button__primary-button',
            ...props
        });
    }
});

const menuTriggerButton = hoistCmp.factory({
    displayName: 'MenuTriggerButtonInSplitButton',
    model: false,

    render({menuTriggerSide = 'right', disabled, menuItemConfs, minimal, intent}) {
        return !disabled ?
            popover({
                position: `bottom-${menuTriggerSide}`,
                minimal: true,
                target: button({
                    intent,
                    minimal,
                    className: `xh-split-button__trigger--${menuTriggerSide}`,
                    icon: Icon.chevronDown({prefix: 'fas'})
                }),
                content: menu({
                    className: 'xh-split-button__menu',
                    items: castArray(menuItemConfs).map((it, idx) => menuItem({
                        key: idx,
                        ...it
                    }))
                })
            }) :
            button({
                intent,
                minimal,
                className: `xh-split-button__trigger--${menuTriggerSide}`,
                disabled: true,
                icon: Icon.chevronDown({prefix: 'fas'})
            });
    }
});

SplitButton.propTypes = {
    /**
     * menuTriggerSide -  Which side of the button does the menu trigger go on?
     * 'left'|'right'
     * defaults to 'right'
     */
    menuTriggerSide: PT.oneOf(['left', 'right']),
    // minimal: PT.bool, // defaults to true
    // disabled: PT.bool,
    // primaryButtonConf: PT.shape({}).isRequired,
    // if menuItemConfs is null or is undefined or if array is empty, primaryButtonConf is rendered as plain button, with no menuTrigger
    menuItemConfs: PT.oneOfType([
        PT.shape({...MenuItem.propTypes}),
        PT.arrayOf(PT.shape({...MenuItem.propTypes}))
    ]),
    ...Button.propTypes
};