/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, RefreshContextModel} from '@xh/hoist/core';
import {bindable, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Base Model for {@link DashCanvasModel} and {@link DashContainerModel}.
 */
export abstract class DashModel<VSPEC, VSTATE, VMODEL> extends HoistModel {
    //---------------------------
    // Core State
    //---------------------------
    viewSpecs: VSPEC[] = [];
    @observable.ref state: VSTATE[];
    @managed @observable.ref viewModels: VMODEL[] = [];

    @managed readonly refreshContextModel: RefreshContextModel;

    //-----------------------------
    // Settable State
    //------------------------------
    @bindable layoutLocked: boolean;
    @bindable contentLocked: boolean;
    @bindable renameLocked: boolean;

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

    constructor() {
        super();
        makeObservable(this);

        this.refreshContextModel = new RefreshContextModel();
    }
}
