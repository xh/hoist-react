/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {ManageDialogModel} from './dialog/ManageDialogModel';
import {SaveAsDialogModel} from './dialog/SaveAsDialogModel';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';

export class ViewManagerLocalModel extends HoistModel {
    readonly parent: ViewManagerModel;

    @managed
    readonly manageDialogModel: ManageDialogModel;

    @managed
    readonly saveAsDialogModel: SaveAsDialogModel;

    @bindable
    isVisible = true;

    constructor(parent: ViewManagerModel) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.manageDialogModel = new ManageDialogModel(parent);
        this.saveAsDialogModel = new SaveAsDialogModel(parent);
    }
}
