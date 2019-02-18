/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, HoistComponent, refreshContextView} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {TabRenderMode} from '@xh/hoist/enums';
import {TabModel} from '@xh/hoist/cmp/tab';

/**
 * @private
 *
 * Wrapper for contents to be shown within a TabContainer. This Component is used by TabContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to `TabModel.renderMode`.
 *   - Track and trigger refreshes according to `TabModel.refreshMode`.
 */
@HoistComponent
export class Tab extends Component {

    static modelClass = TabModel;

    wasActivated = false;

    render() {
        const {content, isActive, renderMode, refreshContextModel} = this.model;

        this.wasActivated = this.wasActivated || isActive;

        if (
            !isActive &&
            (
                (renderMode == TabRenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode == TabRenderMode.LAZY && !this.wasActivated)
            )
        ) {
            // Note: We must render an empty placeholder tab
            // to work with Onsen's tabbar.
            return div();
        }

        const contentElem = content.prototype.render ? elem(content, {flex: 1}) : content({flex: 1});

        return refreshContextView({
            model: refreshContextModel,
            item: contentElem
        });
    }
}
export const tab = elemFactory(Tab);