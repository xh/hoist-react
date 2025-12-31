/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {createObservableRef} from '@xh/hoist/utils/react';
import {isNil} from 'lodash';
import {ReactElement} from 'react';
import {
    type DashViewProvider,
    HoistModel,
    managed,
    ManagedRefreshContextModel,
    MenuItemLike,
    PlainObject,
    RefreshMode,
    RenderMode
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {action, makeObservable, bindable} from '@xh/hoist/mobx';
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

    hostNode: HTMLElement = this.createHostNode();
    viewRef = createObservableRef<HTMLDivElement>();

    //-----------------------
    // Private, internal state.
    //-------------------------
    /**
     * Array of {@link DashViewProvider} instances bound to this model. Used to proactively push
     * state to the target components when new state is set on this model.
     */
    private providers: DashViewProvider<any>[] = [];

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

        this.addReaction({
            track: () => this.viewRef.current,
            run: elem => {
                if (elem) {
                    elem.appendChild(this.hostNode);
                    window.dispatchEvent(new Event('resize'));
                    window.dispatchEvent(new CustomEvent('xhGridRedrawRows'));
                }
            },
            debounce: 0
        });
    }

    /**
     * Modify the viewState of this model. This will push the new state to all registered
     * {@link DashViewProvider} instances.
     */
    @action
    setViewState(viewState: DashViewState) {
        this.viewState = viewState;
        this.providers.forEach(it => it.pushStateToTarget());
    }

    /**
     * Modify a single key on this model's viewState. This will push the new state to all registered
     * {@link DashViewProvider} instances.
     */
    setViewStateKey(key: string, value: any) {
        this.setViewState({...this.viewState, [key]: value});
    }

    override destroy() {
        this.hostNode.remove();
        super.destroy();
    }

    //------------------
    // Persistence
    //------------------
    /**
     * Register a {@link DashViewProvider} to receive state changes.
     * @internal
     */
    registerProvider(provider: DashViewProvider<any>) {
        this.providers.push(provider);
    }

    /**
     * Unregister a {@link DashViewProvider} to stop receiving state changes.
     * @internal
     */
    unregisterProvider(provider: DashViewProvider<any>) {
        this.providers = this.providers.filter(it => it !== provider);
    }

    //------------------
    // Implementation
    //------------------
    /**
     * @returns Empty div set to inherit all styling from its parent
     */
    private createHostNode(): HTMLElement {
        const hostNode = document.createElement('div');
        hostNode.style.all = 'inherit';
        hostNode.classList.add('xh-dash-tab__content');
        return hostNode;
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
