import {PropTypes as PT} from 'prop-types';
import {castArray} from 'lodash';

import {hoistCmp} from '@xh/hoist/core';
import {Button, button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {MenuItem, menu, menuItem, popover} from '@xh/hoist/kit/blueprint';

import './SplitButton.scss';


/**
 * A split button that produces a primary button and a
 * drop down menu of buttons that is opened by clicking on the down arrow icon.
 * Can be configured with:
 * down arrow menu trigger on left or right
 *
 * If menuItems array is empty or null, the component falls back to presenting a plain button
 * with no menu trigger.
 */
export const [SplitButton, splitButton] = hoistCmp.withFactory({
    displayName: 'SplitButton',
    model: false,
    className: 'xh-split-button',

    render(props) {
        const {menuItemConfs, className} = props,
            hasMenu = menuItemConfs && castArray(menuItemConfs).length;
        return buttonGroup({
            className,
            items: [
                primaryButton({
                    side: 'left',
                    ...props
                }),
                menuTriggerButton({
                    omit: !hasMenu,
                    ...props
                }),
                primaryButton({
                    omit: !hasMenu,
                    side: 'right',
                    ...props
                })
            ]
        });
    }
});

const primaryButton = hoistCmp.factory({
    displayName: 'PrimaryButtonInSplitButton',
    model: false,

    render({side, menuTriggerSide='right', disabled, intent, minimal, primaryButtonConf}) {
        return menuTriggerSide == 'left' && side=='right' ||
        menuTriggerSide == 'right' && side=='left' ?
            button({
                className: 'xh-split-button__primary-button',
                intent,
                minimal,
                ...primaryButtonConf,
                disabled
            }) :
            null;
    }
});

const menuTriggerButton = hoistCmp.factory({
    displayName: 'MenuTriggerButtonInSplitButton',
    model: false,

    render({menuTriggerSide='right', disabled, menuItemConfs, minimal, intent}) {
        return !disabled ? popover({
            position: `bottom-${menuTriggerSide}`,
            minimal: true,
            target: button({
                intent: intent,
                minimal: minimal,
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
    menuTriggerSide: PT.oneOf(['left', 'right']), // defaults to 'right'
    intent: PT.oneOf(['success']), // only success supported, as of March 2020
    minimal: PT.bool, // defaults to true
    disabled: PT.bool,
    primaryButtonConf: PT.shape({...Button.propTypes}).isRequired,
    // if menuItemConfs is null or is undefined or if array is empty, primaryButtonConf is rendered as plain button, with no menuTrigger
    menuItemConfs: PT.oneOfType([
        PT.shape({...MenuItem.propTypes}),
        PT.arrayOf(PT.shape({...MenuItem.propTypes}))
    ])
};