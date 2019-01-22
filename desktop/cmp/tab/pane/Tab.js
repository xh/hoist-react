/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {frame} from '@xh/hoist/cmp/layout';
import {TabModel} from './TabModel';

/**
 * Wrapper for contents to be shown within a TabContainer. This is used by TabContainer's internal
 * implementation and not typically rendered directly by applications.
 *
 * This wrapper component provides a default implementation of the following behavior:
 *
 *   - Mounts/unmounts its contents according to TabContainerModel.tabRenderMode.
 *   - Stretches its contents using a flex layout.
 *
 */
@HoistComponent
export class Tab extends Component {

    static modelClass = TabModel;
    baseClassName = 'xh-tab';

    wasActivated = false;

    render() {
        const {content, isActive, containerModel, childRef} = this.model,
            mode = containerModel.tabRenderMode;

        this.wasActivated = this.wasActivated || isActive;

        if (!isActive && (mode == 'unmountOnHide' || !this.wasActivated && mode == 'lazy')) {
            return null;
        }

        const item = content.prototype.render ?
            elem(content, {flex: 1, ref: childRef.ref}) :
            content({flex: 1});
        
        return frame({
            display: isActive ? 'flex' : 'none',
            className: this.getClassName(),
            item
        });
    }
}
export const tab = elemFactory(Tab);
