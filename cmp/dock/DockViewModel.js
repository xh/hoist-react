/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {bindable, observable, action} from '@xh/hoist/mobx';
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
    allowClose;
    allowDialog;

    containerModel;

    /**
     * @param {Object} c - DockViewModel configuration.
     * @param {string} c.id - unique identifier for this DockViewModel.
     * @param {DockContainerModel} c.containerModel - parent DockContainerModel. Provided by the
     *      container when constructing these models - no need to specify manually.
     * @param {string} [c.title] - Title text added to the header.
     * @param {Icon} [c.icon] - An icon placed at the left-side of the header.
     * @param {Object} c.content - content to be rendered by this DockedView. Component class or a
     *      custom element factory of the form returned by elemFactory.
     * @param {boolean} [c.docked] - true to initialise in dock, false to use Dialog. Respects allowDialog. Default true.
     * @param {boolean} [c.collapsed] - true to initialise collapsed, false for expanded. Default false.
     * @param {boolean} [c.allowClose] - true to allow removing from the dock entirely. Default true.
     * @param {boolean} [c.allowDialog] - true to allow popping out of the dock and displaying in a Dialog. Default true.
     */
    constructor({
        id,
        containerModel,
        title,
        icon,
        content,
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
        this.docked = docked;
        this.collapsed = collapsed;
        this.allowClose = allowClose;
        this.allowDialog = allowDialog;
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

    destroy() {
        XH.safeDestroy(this.content);
    }

}