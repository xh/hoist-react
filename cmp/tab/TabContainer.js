/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, ModelPublishMode, uses, XH} from '@xh/hoist/core';
import {tabContainerImpl as desktopTabContainerImpl} from '@xh/hoist/dynamics/desktop';
import {tabContainerImpl as mobileTabContainerImpl} from '@xh/hoist/dynamics/mobile';
import PT from 'prop-types';
import {TabContainerModel} from './TabContainerModel';

/**
 * Display a set of child Tabs and (optionally) a switcher control.
 *
 * By default this TabContainer will install a TabSwitcher above the Tabs to control the currently
 * displayed Tab. The 'TabContainerModel.switcher' property can be adjusted to place the switcher
 * control on alternative edges of the container.
 *
 * If `switcher` is set to false then no TabSwitcher will be installed.  This setting
 * is useful for applications that wish to place an associated TabSwitcher elsewhere in the graphical
 * hierarchy (e.g. a shared menu bar), or control the visible Tab directly via other means.
 *
 * This component's TabContainerModel configures all aspects of this container, including its children.
 * See that class for more details.
 *
 * @see TabContainerModel
 */
export const [TabContainer, tabContainer] = hoistCmp.withFactory({
    displayName: 'TabContainer',
    model: uses(TabContainerModel, {publishMode: ModelPublishMode.LIMITED}),
    className: 'xh-tab-container',

    render(props, ref) {
        return XH.isMobileApp ? mobileTabContainerImpl(props, ref) : desktopTabContainerImpl(props, ref);
    }
});

TabContainer.propTypes = {
    model: PT.oneOfType([PT.instanceOf(TabContainerModel), PT.object])
};


