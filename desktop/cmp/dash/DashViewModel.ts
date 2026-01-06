/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isNil} from 'lodash';
import {ReactElement} from 'react';
import {
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    MenuItemLike,
    PlainObject,
    RefreshMode,
    RenderMode
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {DashViewSpec} from './DashViewSpec';

export type DashViewState = PlainObject;

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
export class DashViewModel<T extends DashViewSpec = DashViewSpec> extends HoistModel {
    id: string;

    /** DashViewSpec used to create this view. */
    viewSpec: T;

    /**
     * Parent DashContainerModel or DashCanvasModel. Provided by the container when
     * constructing these models - no need to specify manually.
     */
    containerModel: any;

    /** Title with which to initialize the view.  Value is persisted. */
    @bindable title: string;

    /**
     * Additional info that will be displayed after the title.
     * Applications can bind to this property to provide dynamic title details.
     * Value is not persisted.
     **/
    @bindable titleDetails: string;

    get fullTitle(): string {
        return [this.title, this.titleDetails].filter(it => !isNil(it)).join(' ');
    }

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

    constructor({id, viewSpec, icon, title, viewState = null, containerModel}: DashViewConfig<T>) {
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
export interface DashViewConfig<T extends DashViewSpec = DashViewSpec> {
    id: string;
    viewSpec: T;
    icon?: ReactElement;
    title?: string;
    viewState?: DashViewState;
    containerModel?: any;
}
