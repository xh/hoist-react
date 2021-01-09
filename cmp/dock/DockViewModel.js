/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, ManagedRefreshContextModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Model for a DockView within a DockContainer. Specifies the actual content (child component)
 * to be rendered within the view and manages that content's collapsed and docked state.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `DockContainerModel.views` constructor config or via
 * the `DockContainerModel.addView()` method.
 */
@HoistModel
export class DockViewModel {

    id;
    @bindable title;
    @bindable icon;
    @observable docked;
    @observable collapsed;
    content;
    width;
    height;
    collapsedWidth;
    allowClose;
    allowDialog;

    containerModel;
    @managed refreshContextModel;

    get isActive() {
        return !this.collapsed;
    }

    get renderMode() {
        return this._renderMode ?? this.containerModel.renderMode;
    }

    get refreshMode() {
        return this._refreshMode ?? this.containerModel.refreshMode;
    }

    /**
     * @param {Object} c - DockViewModel configuration.
     * @param {string} c.id - unique identifier for this DockViewModel.
     * @param {DockContainerModel} c.containerModel - parent DockContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {string} [c.title] - Title text added to the header.
     * @param {Element} [c.icon] - An icon placed at the left-side of the header.
     * @param {(Object|function)} c.content - content to be rendered by this DockView.
     *      HoistComponent or a function returning a react element.
     * @param {number} [c.width] - width in pixels. If not set, width will be determined by the content.
     * @param {number} [c.height] - height in pixels. If not set, height will be determined by the content.
     * @param {number} [c.collapsedWidth] - width of collapsed header in pixels. If not set, width
     *      will be determined by the length of the title.
     * @param {RenderMode} [c.renderMode] - strategy for rendering this DockView. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     * @param {RefreshMode} [c.refreshMode] - strategy for refreshing this DockView. If null, will
     *      default to its container's mode. See enum for description of supported modes.
     * @param {boolean} [c.docked] - true (default) to initialise in dock, false to use Dialog.
     *      Respects allowDialog.
     * @param {boolean} [c.collapsed] - true to initialise collapsed, false (default) for expanded.
     * @param {boolean} [c.allowClose] - true (default) to allow removing from the dock entirely.
     * @param {boolean} [c.allowDialog] - true (default) to allow popping out of the dock and
     *      displaying in a modal Dialog.
     */
    constructor({
        id,
        containerModel,
        title,
        icon,
        content,
        width,
        height,
        collapsedWidth,
        refreshMode,
        renderMode,
        docked = true,
        collapsed = false,
        allowClose = true,
        allowDialog = true
    }) {
        throwIf(!id, 'DockViewModel requires an id');
        this.id = id;
        this.containerModel = containerModel;
        this.title = title;
        this.icon = icon;
        this.content = content;
        this.width = width;
        this.height = height;
        this.collapsedWidth = collapsedWidth;

        this.docked = docked;
        this.collapsed = collapsed;
        this.allowClose = allowClose;
        this.allowDialog = allowDialog;

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new ManagedRefreshContextModel(this);
    }

    //-----------------------
    // Docked state
    //-----------------------
    toggleDocked() {
        if (this.docked) {
            this.showInDialog();
        } else {
            this.showInDock();
        }
    }

    @action
    showInDialog() {
        if (!this.allowDialog) return;
        this.containerModel.views.forEach(it => it.showInDock());
        this.docked = false;
    }

    @action
    showInDock() {
        this.docked = true;
    }

    //-----------------------
    // Collapsed state
    //-----------------------
    toggleCollapsed() {
        if (this.collapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    @action
    expand() {
        this.collapsed = false;
    }

    @action
    collapse() {
        this.collapsed = true;
        this.docked = true;
    }

    //-----------------------
    // Actions
    //-----------------------
    close() {
        this.containerModel.removeView(this.id);
    }
}