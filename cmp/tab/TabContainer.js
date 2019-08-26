/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, hoistComponent, elemFactory} from '@xh/hoist/core';
import PT from 'prop-types';
import {throwIf} from '@xh/hoist/utils/js';

import {tabContainer as desktopTabContainer} from '@xh/hoist/dynamics/desktop';
import {tabContainer as mobileTabContainer} from '@xh/hoist/dynamics/mobile';
import {TabContainerModel} from './TabContainerModel';

/**
 * Display a set of child Tabs and (optionally) a switcher control.
 *
 * By default this TabContainer will install a TabSwitcher above the Tabs to control the currently
 * displayed Tab. The 'TabContainerModel.switcherPosition' property can be adjusted to place
 * the switcher control on alternative edges of the container.
 *
 * If the switcherPosition is set to 'none' then no TabSwitcher will be installed.  This latter case
 * is useful for applications that wish to place an associated TabSwitcher elsewhere in the graphical
 * hierarchy (e.g. a shared menu bar), or control the visible Tab directly via other means.
 *
 * This component's TabContainerModel configures all aspects of this container, including its children.
 * See that class for more details.
 *
 * @see TabContainerModel
 */
export const TabContainer = hoistComponent({
    displayName: 'TabContainer',

    render(props) {
        throwIf(
            props.switcherPosition,
            "'switcherPosition' is no longer present on TabContainer.  Please specify on TabContainerModel instead."
        );

        return XH.isMobile ? mobileTabContainer(props) : desktopTabContainer(props);
    }
});
TabContainer.propTypes = {
    model: PT.oneOfType([PT.instanceOf(TabContainerModel), PT.object]).isRequired
};

export const tabContainer = elemFactory(TabContainer);

