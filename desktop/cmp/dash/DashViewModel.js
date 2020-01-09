/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Model for a DashView within a DashContainer. Specifies the actual content (child component)
 * to be rendered within the view and manages that content's title and icon.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `DashContainerModel.views` constructor config or via
 * the `DashContainerModel.addView()` method.
 */
@HoistModel
export class DashViewModel {

    id;
    title;
    icon;
    unique;
    allowClose;

    containerModel;

    get glConfig() {
        const {id, title, allowClose} = this;
        return {
            component: id,
            type: 'react-component',
            title,
            isClosable: allowClose
        };
    }

    /**
     * @param {Object} c - DashViewModel configuration.
     * @param {string} c.id - unique identifier for this DashViewModel.
     * @param {Object} c.content - content to be rendered by this DashView. Component class or a
     *      custom element factory of the form returned by elemFactory.
     * @param {DashContainerModel} c.containerModel - parent DashContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {string} c.title - Title text added to the tab header.
     * @param {Icon} [c.icon] - An icon placed at the left-side of the tab header.
     * @param {boolean} [c.unique] - true to prevent multiple instances of this view. Default false.
     * @param {boolean} [c.allowClose] - true (default) to allow removing from the DashContainer.
     */
    constructor({
        id,
        content,
        containerModel,
        title,
        icon,
        unique = false,
        allowClose = true
    }) {
        throwIf(!id, 'DashViewModel requires an id');
        throwIf(!content, 'DashViewModel requires content');
        throwIf(!title, 'DashViewModel requires a title');

        this.id = id;
        this.content = content;
        this.containerModel = containerModel;
        this.title = title;
        this.icon = icon;
        this.unique = unique;
        this.allowClose = allowClose;
    }

}