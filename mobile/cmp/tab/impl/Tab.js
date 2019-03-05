/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
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
            // Note: We must render an empty placeholder Onsen page
            // to work with Onsen's tabbar.
            return onsenPage();
        }

        const contentElem = content.prototype.render ? elem(content) : content();

        return refreshContextView({
            model: refreshContextModel,
            item: contentElem
        });
    }
}
export const tab = elemFactory(Tab);