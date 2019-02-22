/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {clone, find} from 'lodash';

/**
 * State management for the ColChooser component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel
export class ColChooserModel {

    gridModel = null;

    @observable.ref data = [];
    @observable isOpen = false;

    /**
     * @param {GridModel} gridModel - model for the grid to be managed.
     */
    constructor(gridModel) {
        this.gridModel = gridModel;
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.close()
        });
    }

    @action
    open() {
        this.syncChooserData();
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    setHidden(colId, hidden) {
        const data = clone(this.data),
            col = find(data, {colId});

        if (!col || col.locked || col.exclude) return;

        col.hidden = hidden;
        this.setData(data);
    }

    commit() {
        const colChanges = this.data.map(it => {
            const {colId, hidden} = it;
            return {colId, hidden};
        });
        this.gridModel.applyColumnStateChanges(colChanges);
    }

    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const {gridModel} = this;

        const data = gridModel.getLeafColumns().map(it => {
            const visible = gridModel.isColumnVisible(it.colId);
            return {
                colId: it.colId,
                text: it.chooserName,
                hidden: !visible,
                exclude: it.excludeFromChooser,
                locked: visible && !it.hideable
            };
        });

        this.setData(data);
    }

    @action
    setData(data) {
        this.data = data;
    }
}
