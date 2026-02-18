/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    Content,
    Thunkable,
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    RefreshContextModel,
    RefreshMode,
    RenderMode,
    Awaitable
} from '@xh/hoist/core';
import {ModalSupportModel} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupportModel';
import '@xh/hoist/desktop/register';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
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
    /** Width: if not set, will be determined by content. */
    width?: string | number;
    /** Height: if not set, will be determined by content. */
    height?: string | number;
    /** Width of collapsed header. If not set, width will be determined by the length of the title. */
    collapsedWidth?: string | number;
    /** Width when displayed in a modal dialog.  If not set, will fall back on default `width`. */
    dialogWidth?: string | number;
    /** Height when displayed in a modal dialog.  If not set, will fall back on default `height`. */
    dialogHeight?: string | number;
    /** Strategy for rendering this DockView. If null, will default to its container's mode. */
    renderMode?: RenderMode;
    /** Strategy for refreshing this DockView. If null, will default to its container's mode. */
    refreshMode?: RefreshMode;
    /** true to exclude this DockView.  */
    omit?: Thunkable<boolean>;
    /** true (default) to initialise in dock, false to use Dialog. Respects allowDialog. */
    docked?: boolean;
    /** true to initialise collapsed, false (default) for expanded. */
    collapsed?: boolean;
    /** true (default) to allow removing from the dock entirely. */
    allowClose?: boolean;
    /** true (default) to allow popping out of the dock and displaying in a modal Dialog. */
    allowDialog?: boolean;
    /** Awaitable callback invoked on close. Return false to prevent close. */
    onClose?: () => Awaitable<boolean | void>;
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
    @bindable title: string;
    @bindable.ref icon: ReactElement;
    @observable docked: boolean;
    @observable collapsed: boolean;
    content: Content;
    width: string | number;
    height: string | number;
    collapsedWidth: string | number;
    dialogWidth: string | number;
    dialogHeight: string | number;
    allowClose: boolean;
    allowDialog: boolean;
    onClose?: () => Awaitable<boolean | void>;

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
        dialogWidth,
        dialogHeight,
        refreshMode,
        renderMode,
        docked = true,
        collapsed = false,
        allowClose = true,
        allowDialog = true,
        onClose
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
        this.dialogWidth = dialogWidth ?? width;
        this.dialogHeight = dialogHeight ?? height;

        this.docked = docked;
        this.collapsed = collapsed;
        this.allowClose = allowClose;
        this.allowDialog = allowDialog;
        this.onClose = onClose;

        this._renderMode = renderMode;
        this._refreshMode = refreshMode;

        this.refreshContextModel = new ManagedRefreshContextModel(this);

        this.modalSupportModel = new ModalSupportModel({
            width: dialogWidth ?? null,
            height: dialogHeight ?? null,
            defaultModal: !docked,
            canOutsideClickClose: false
        });
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
        this.modalSupportModel.isModal = true;
    }

    @action
    showInDock() {
        this.docked = true;
        this.modalSupportModel.isModal = false;
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
        this.modalSupportModel.isModal = false;
        this.collapsed = false;
    }

    @action
    collapse() {
        this.modalSupportModel.isModal = false;
        this.collapsed = true;
        this.docked = true;
    }

    //-----------------------
    // Actions
    //-----------------------
    close() {
        Promise.resolve(this.onClose?.()).then(v => {
            if (v !== false) this.containerModel.removeView(this.id);
        });
    }
}
