/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {frame} from '@xh/hoist/cmp/layout';
import {TabModel} from '../TabModel';
import {refreshView} from '@xh/hoist/cmp/refresh';

/**
 * @private
 *
 * Wrapper for contents to be shown within a TabContainer. This is used by TabContainer's internal
 * implementation.
 *
 * This wrapper component provides a default implementation of the following behavior:
 *
 *   - Mounts/unmounts its contents according to TabModel.renderMode.
 *   - Stretches its contents using a flex layout.
 */
@HoistComponent
export class Tab extends Component {

    static modelClass = TabModel;
    baseClassName = 'xh-tab';

    wasActivated = false;

    render() {
        const {content, isActive, renderMode, refreshModel} = this.model;

        this.wasActivated = this.wasActivated || isActive;

        if (!isActive && (renderMode == 'unmountOnHide' || !this.wasActivated && renderMode == 'lazy')) {
            return null;
        }

        const contentElem = content.prototype.render ? elem(content, {flex: 1}) : content({flex: 1});
        
        return frame({
            display: isActive ? 'flex' : 'none',
            className: this.getClassName(),
            item: refreshView({
                model: refreshModel,
                item: contentElem
            })
        });
    }
}
export const tab = elemFactory(Tab);
