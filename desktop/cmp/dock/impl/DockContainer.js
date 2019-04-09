/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {DockContainerModel} from '@xh/hoist/cmp/dock';

import {dockView} from './DockView';
import './Dock.scss';

/**
 * Desktop implementation of DockContainer.
 *
 * @private
 */
@HoistComponent
@LayoutSupport
export class DockContainer extends Component {

    static modelClass = DockContainerModel;

    baseClassName = 'xh-dock-container';

    render() {
        const {direction} = this.model;

        return hbox({
            className: this.getClassName(`xh-dock-container--${direction}`),
            items: this.model.views.map(model => {
                return dockView({key: model.xhId, model});
            }),
            ...this.getLayoutProps()
        });
    }

}

export const dockContainer = elemFactory(DockContainer);