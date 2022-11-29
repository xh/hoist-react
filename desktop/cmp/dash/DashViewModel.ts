/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    MenuItemLike,
    RefreshMode,
    RenderMode
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {ReactElement} from 'react';
import {DashViewSpec} from './DashViewSpec';

export type DashViewState = Record<string, any>;

/**
 * Model for a content item within a DashContainer or DashCanvas.
 * Supports state management, a refresh context, and active state.
 *
 * This model is not created directly within applications. Instead, specify a
 * DashViewSpec. Individual instances of this will then be loaded dynamically from
 * user state or user actions.
 *
 * Content hosted within this view can use this model at runtime to access and set state
 * for the view or access other information.
 */
export class DashViewModel extends HoistModel {

    id: string;

    /** DashViewSpec used to create this view. */
    viewSpec: DashViewSpec;

    /**
     * Parent DashContainerModel or DashCanvasModel. Provided by the container when
     * constructing these models - no need to specify manually.
     */
    containerModel: any;

    /** Title with which to initialize the view. */
    @bindable title: string;

    /** Icon with which to initialize the view. */
    @bindable.ref icon: ReactElement;

    /** State with which to initialize the view. */
    @bindable.ref viewState: DashViewState;

    /** Extra menu items for the context menu. */
    @bindable.ref extraMenuItems: MenuItemLike[] = [];

    @managed refreshContextModel;
    @bindable isActive: boolean;

    get renderMode(): RenderMode {
        return this.viewSpec.renderMode ?? this.containerModel.renderMode;
    }

    get refreshMode(): RefreshMode {
        return this.viewSpec.refreshMode ?? this.containerModel.refreshMode;
    }

    constructor({
        id,
        viewSpec,
        icon,
        title,
        viewState = null,
        containerModel
    }: DashViewConfig) {
        super();
        makeObservable(this);
        throwIf(!id, 'DashViewModel requires an id');
        throwIf(!viewSpec, 'DashViewModel requires an DashViewSpec');

        this.id = id;
        this.viewSpec = viewSpec;
        this.icon = icon ?? viewSpec.icon;
        this.title = title ?? viewSpec.title;
        this.viewState = viewState;
        this.containerModel = containerModel;

        this.refreshContextModel = new ManagedRefreshContextModel(this);
    }

    /**
     * Modify a single key on this model's viewState
     */
    setViewStateKey(key: string, value: any) {
        this.viewState = {...this.viewState, [key]: value};
    }
}

/** @internal */
export interface DashViewConfig {
    id: string;
    viewSpec: DashViewSpec;
    icon?: ReactElement;
    title?: string;
    viewState?: DashViewState;
    containerModel?: any;
}