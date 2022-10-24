/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {HoistModel, managed, PersistenceProvider} from '@xh/hoist/core';

/**
 * Base Model for {@see DashCanvasModel} and {@see DashContainerModel}.
 */
export abstract class DashModel<VSPEC, VSTATE, VMODEL> extends HoistModel {

    //---------------------------
    // Core State
    //---------------------------
    viewSpecs: VSPEC[] = [];
    @observable.ref state: VSTATE[];
    @managed @observable.ref viewModels: VMODEL[] = [];

    //-----------------------------
    // Settable State
    //------------------------------
    @observable layoutLocked: boolean;
    @observable contentLocked: boolean;
    @observable renameLocked: boolean;

    @action setLayoutLocked(v: boolean) {this.layoutLocked = v}
    @action setContentLocked(v: boolean) {this.contentLocked = v}
    @action setRenameLocked(v: boolean) {this.renameLocked = v}

    //------------------------------
    // Immutable public properties
    //------------------------------
    emptyText: string;
    addViewButtonText: string;
    extraMenuItems: any[];

    abstract get isEmpty(): boolean;

    //------------------------
    // Implementation properties
    //------------------------
    protected restoreState: any;
    protected provider: PersistenceProvider;

    constructor() {
        super();
        makeObservable(this);
    }
}