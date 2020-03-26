import {PropTypes as PT} from 'prop-types';
import {castArray} from 'lodash';

import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {buttonGroup, menu, menuItem, popover} from '@xh/hoist/kit/blueprint';

import './MenuButton.scss';


export const [MenuButton, menuButton] = hoistCmp.withFactory({
    displayName: 'MenuButton',
    model: false,
    className: 'xh-menu-button',

    render(props) {
        const {menuItemConfs} = props;
        return !menuItemConfs || !castArray(menuItemConfs).length ?
            primaryButton({
                side: 'left',
                ...props
            }) :
            buttonGroup({
                className: 'menubutton',
                items: [
                    primaryButton({
                        side: 'left',
                        ...props
                    }),
                    menuTriggerButton({...props}),
                    primaryButton({
                        side: 'right',
                        ...props
                    })
                ]
            });
    }
});

const primaryButton = hoistCmp.factory({
    displayName: 'MenuButton',
    model: false,

    render({side, menuTriggerSide='right', disabled, intent, minimal, primaryButtonConf}) {
        return menuTriggerSide == 'left' && side=='right' ||
        menuTriggerSide == 'right' && side=='left' ?
            button({
                intent,
                minimal,
                ...primaryButtonConf,
                disabled
            }) :
            null;
    }
});

const menuTriggerButton = hoistCmp.factory({
    displayName: 'MenuTriggerButton',
    model: false,

    render({menuTriggerSide='right', disabled, menuItemConfs, minimal, intent}) {
        return !disabled ? popover({
            position: `bottom-${menuTriggerSide}`,
            minimal: true,
            target: button({
                intent: intent,
                minimal: minimal,
                className: `menubutton__trigger--${menuTriggerSide}`,
                icon: Icon.chevronDown({prefix: 'fas'})
            }),
            content: menu({
                className: 'menubutton__menu',
                items: castArray(menuItemConfs).map((it, idx) => menuItem({
                    key: idx,
                    ...it
                }))
            })
        }) :
            button({
                intent,
                minimal,
                className: `menubutton__trigger--${menuTriggerSide}`,
                disabled: true,
                icon: Icon.chevronDown({prefix: 'fas'})
            });
    }
});

MenuButton.propTypes = {
    menuTriggerSide: PT.oneOf(['left', 'right']), // defaults to 'right'
    intent: PT.oneOf(['success']), // only success supported, as of March 2020
    minimal: PT.bool, // defaults to true
    disabled: PT.bool,
    primaryButtonConf: PT.object.isRequired,
    // if menuItemConfs is null or is undefined or if array is empty, primaryButtonConf is rendered as plain button, with no menuTrigger
    menuItemConfs: PT.oneOfType([PT.object, PT.arrayOf(PT.object)])
};