/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Spec used to generate a DashTabs and DashTabModels within a DashContainer.
 *
 * This class is not typically created directly within applications. Instead, specify
 * DashViewSpec configs via the `DashContainerModel.viewSpecs` constructor config.
 */
export class DashViewSpec {

    id;
    content;
    title;
    icon;
    contentModelFn;
    unique;
    allowClose;
    renderMode;
    refreshMode;

    /**
     * @param {string} id - unique identifier of the DashViewSpec
    * @param {(Object|function)} c.content - content to be rendered by this DashView.
     *      HoistComponent or a function returning a react element.
     * @param {string} title - Title text added to the tab header.
     * @param {Icon} [icon] - An icon placed at the left-side of the tab header.
     * @param {boolean} [unique] - true to prevent multiple instances of this view. Default false.
     * @param {boolean} [allowClose] - true (default) to allow removing from the DashContainer.
     * @param {RenderMode} [renderMode] - strategy for rendering this DashTab. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     * @param {RefreshMode} [refreshMode] - strategy for refreshing this DashTab. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     */
    constructor({
        id,
        content,
        title,
        icon,
        unique = false,
        allowClose = true,
        renderMode,
        refreshMode
    }) {
        throwIf(!id, 'DashViewSpec requires an id');
        throwIf(!content, 'DashViewSpec requires content');
        throwIf(!title, 'DashViewSpec requires a title');

        this.id = id;
        this.content = content;
        this.title = title;
        this.icon = icon;
        this.unique = unique;
        this.allowClose = allowClose;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
    }


    //---------------------
    // Hoist Implementation
    //---------------------
    get goldenLayoutConfig() {
        const {id, title, allowClose} = this;
        return {
            component: id,
            type: 'react-component',
            title,
            isClosable: allowClose
        };
    }
}