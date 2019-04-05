/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';

import {DockContainerModel} from './DockContainerModel';
import {dockView} from './impl/DockView';
import './Dock.scss';

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
@LayoutSupport
export class DockContainer extends Component {

    static modelClass = DockContainerModel;

    baseClassName = 'xh-dock-container';

    render() {
        const {direction} = this.model;

        return hbox({
            className: this.getClassName(`xh-dock-container-${direction}`),
            items: this.model.views.map(model => {
                return dockView({key: model.xhId, model});
            }),
            ...this.getLayoutProps()
        });
    }

}

export const dockContainer = elemFactory(DockContainer);