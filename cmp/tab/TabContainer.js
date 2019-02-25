/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';

import {tabContainer as desktopTabContainer} from '@xh/hoist/dynamics/desktop';
import {tabContainer as mobileTabContainer} from '@xh/hoist/dynamics/mobile';

/**
 * A cross-platform wrapper which renders platform specific TabContainer implementation classes.
 *
 * This component's TabContainerModel configures all aspects of this container, including its children.
 *
 * @see TabContainerModel
 */
@HoistComponent
export class TabContainer extends Component {
    render() {
        const {props} = this;
        return XH.isMobile ? mobileTabContainer(props) : desktopTabContainer(props);
    }
}

export const tabContainer = elemFactory(TabContainer);