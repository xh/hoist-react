/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {Content, HoistModel, managed, ManagedRefreshContextModel, RefreshContextModel, RefreshMode, RenderMode, XH} from '@xh/hoist/core';
import {ModalSupportModel} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupportModel';
import '@xh/hoist/desktop/register';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {ReactElement} from 'react';
import {DockContainerModel} from './DockContainerModel';

export interface DockViewConfig {
    /** Unique identifier for this DockViewModel. */
    id: string;
    /** Parent DockContainerModel. Provided by the container when constructing the model - no need to specify manually. */
    containerModel?: DockContainerModel;
    /** Title text added to the header. */
    title?: string;
    /** An icon placed at the left-side of the header. */
    icon?: ReactElement;
    /** Content to be rendered by this DockView. */
    content: Content;
    /** Width in pixels. If not set, width will be determined by the content. */
    width?: number;
    /** Height in pixels. If not set, height will be determined by the content. */
    height?: number;
    /** Width of collapsed header in pixels. If not set, width will be determined by the length of the title. */
    collapsedWidth?: number;
    /** Strategy for rendering this DockView. If null, will default to its container's mode. */
    renderMode?: RenderMode;
    /** Strategy for refreshing this DockView. If null, will default to its container's mode. */
    refreshMode?: RefreshMode;
    /** true to exclude this DockView.  */
    omit?: boolean;
    /** true (default) to initialise in dock, false to use Dialog. Respects allowDialog. */
    docked?: boolean;
    /** true to initialise collapsed, false (default) for expanded. */
    collapsed?: boolean;
    /** true (default) to allow removing from the dock entirely. */
    allowClose?: boolean;
    /** true (default) to allow popping out of the dock and displaying in a modal Dialog. */
    allowDialog?: boolean;
}

/**
 * Model for a DockView within a DockContainer. Specifies the actual content (child component)
 * to be rendered within the view and manages that content's collapsed and docked state.
 *
 * This model is not typically created directly within applications. Instead, specify a
 * configuration for it via the `DockContainerModel.views` constructor config or via
 * the `DockContainerModel.addView()` method.
 */
export class DockViewModel extends HoistModel {

    id: string;
    @observable title: string;
    @observable.ref icon: ReactElement;
    @observable docked: boolean;
    @observable collapsed: boolean;
    content: Content;
    width: number;
    height: number;
    collapsedWidth: number;
    allowClose: boolean;
    allowDialog: boolean;

    containerModel: DockContainerModel;
    @managed refreshContextModel: RefreshContextModel;
    @managed modalSupportModel: ModalSupportModel;

    private _renderMode: RenderMode;
    private _refreshMode: RefreshMode;

    get isActive(): boolean {
        return !this.collapsed;
    }

    get renderMode(): RenderMode {
        return this._renderMode ?? this.containerModel.renderMode;
    }

    get refreshMode(): RefreshMode {
        return this._refreshMode ?? this.containerModel.refreshMode;
    }

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
    }: DockViewConfig) {
        super();
        makeObservable(this);
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

        this.modalSupportModel = new ModalSupportModel({
            width: width ?? null, height: height ?? null, canOutsideClickClose: false
        });
    }

    @action
    setTitle(title: string) {
        this.title = title;
    }

    @action
    setIcon(icon: ReactElement) {
        this.icon = icon;
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
        this.modalSupportModel.setIsModal(true);
    }

    @action
    showInDock() {
        this.docked = true;
        this.modalSupportModel.setIsModal(false);
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
        this.modalSupportModel.setIsModal(false);
        this.collapsed = false;
    }

    @action
    collapse() {
        this.modalSupportModel.setIsModal(false);
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
        super.destroy();
    }

}
