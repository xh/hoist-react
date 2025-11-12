/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {TabSwitcherProps} from '@xh/hoist/cmp/tab/Types';
import {BoxProps, hoistCmp, HoistProps, refreshContextView, uses, XH} from '@xh/hoist/core';
import {tabContainerImpl as desktopTabContainerImpl} from '@xh/hoist/dynamics/desktop';
import {tabContainerImpl as mobileTabContainerImpl} from '@xh/hoist/dynamics/mobile';
import {TabContainerModel} from './TabContainerModel';

export interface TabContainerProps extends HoistProps<TabContainerModel>, BoxProps {
    /**
     * Props to apply to child TabContainers, if any. Specify as an object or a function
     * that returns props based on the tabId and depth of the child container.
     */
    childTabContainerProps?:
        | TabContainerProps
        | ((ctx: {tabId: string; depth: number}) => TabContainerProps);
    /**
     * Indicates whether to include a default switcher docked within this component. Specify as a
     * boolean or an object containing props for a TabSwitcher component. Set to false to not
     * include a switcher. Defaults to true.
     */
    switcher?: boolean | TabSwitcherProps;
}

/**
 * Display a set of child Tabs and (optionally) a switcher control.
 *
 * By default, this TabContainer will install a TabSwitcher above the Tabs to control the currently
 * displayed Tab. The 'TabContainerProps.switcher' property can be adjusted to place the switcher
 * control on alternative edges of the container.
 *
 * If `switcher` is set to false then no TabSwitcher will be installed.  This setting
 * is useful for applications that wish to place an associated TabSwitcher elsewhere in the
 * graphical hierarchy (e.g. a shared menu bar), or control the visible Tab directly via other
 * means.
 *
 * This component's TabContainerModel configures all aspects of this container, including its
 * children. See that class for more details.
 */
export const [TabContainer, tabContainer] = hoistCmp.withFactory<TabContainerProps>({
    displayName: 'TabContainer',
    model: uses(TabContainerModel, {publishMode: 'limited'}),
    className: 'xh-tab-container',

    render(props, ref) {
        return refreshContextView({
            model: props.model.refreshContextModel,
            item: XH.isMobileApp
                ? mobileTabContainerImpl(props, ref)
                : desktopTabContainerImpl(props, ref)
        });
    }
});
