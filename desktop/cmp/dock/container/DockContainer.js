/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import PT from 'prop-types';
import {hbox} from '@xh/hoist/cmp/layout';

import {DockContainerModel} from './DockContainerModel';
import {dockView} from '../view/DockView';
import '../Dock.scss';

@HoistComponent
export class DockContainer extends Component {

    static modelClass = DockContainerModel;

    static propTypes = {
        /** Flow direction of docked item . */
        direction: PT.oneOf(['ltr', 'rtl'])
    };

    static defaultProps = {
        direction: 'ltr'
    };

    baseClassName = 'xh-dock-container';

    render() {
        const {viewModels} = this.model,
            views = viewModels.map(model => dockView({model}));

        return hbox({
            className: this.getClassName(`xh-dock-container-${this.props.direction}`),
            items: views
        });
    }

}

export const dockContainer = elemFactory(DockContainer);