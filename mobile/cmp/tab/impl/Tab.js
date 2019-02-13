/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, refreshContextView} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {TabRenderMode} from '@xh/hoist/enums';
import {TabModel} from '../TabModel';

/**
 * @private
 */
@HoistComponent
export class Tab extends Component {

    static modelClass = TabModel;

    wasActivated = false;

    render() {
        const {pageFactory, pageProps, isActive, renderMode, refreshContextModel} = this.model;

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

        return refreshContextView({
            model: refreshContextModel,
            item: pageFactory({
                ...pageProps,
                tabModel: this.model
            })
        });
    }
}
export const tab = elemFactory(Tab);