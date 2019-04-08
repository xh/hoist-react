/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import PT from 'prop-types';
import {throwIf} from '@xh/hoist/utils/js';

import {dockContainer as desktopDockContainer} from '@xh/hoist/dynamics/desktop';
import {DockContainerModel} from './DockContainerModel';

/**
 * Display a set of views in a dock. Using a DockContainer provides a user-friendly way to display multiple
 * views simultaneously, allowing users to choose of which views are expanded at any given time. Docked views
 * can be either expanded or collapsed. They also support being taken out of the dock and displayed as a dialog.
 *
 * Docked views are sized according to their content. It is recommended to provide the docked
 * content with a fixed size.
 *
 * This component's DockContainerModel configures all aspects of this container, including its views.
 * See that class for more details.
 *
 * @see DockContainerModel
 */
@HoistComponent
export class DockContainer extends Component {

    static propTypes = {
        model: PT.oneOfType([PT.instanceOf(DockContainerModel), PT.object]).isRequired
    }
    static modelClass = DockContainerModel;

    render() {
        throwIf(XH.isMobile, 'DockContainer is not implemented on mobile');
        return desktopDockContainer(this.props);
    }

}

export const dockContainer = elemFactory(DockContainer);