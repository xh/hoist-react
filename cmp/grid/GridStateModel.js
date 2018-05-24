/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, find} from 'lodash';

@HoistModel()
export class GridStateModel {

    trackColumns = true;

    parent = null;
    xhStateId = null;

    state = {};
    userState = null;
    defaultState = null;


    constructor({trackColumns, xhStateId}) {
        this.trackColumns = trackColumns;
        this.xhStateId = xhStateId;
    }

    init(gridModel) {
        this.parent = gridModel;

        this.ensureCompatible();

        if (this.trackColumns) {
            this.addReaction({
                track: () => this.parent.columns, // columns are not changing on reorder
                run: this.onColumnsChanged // firing on load due to first state setting of columns, is this a problem?
            });
        }

        this.initializeState();
    }

    initializeState() {
        this.userState = this.readState(this.getStateKey());
        this.defaultState = this.readStateFromGrid();

        this.loadState(this.userState);
    }

    readStateFromGrid() {
        return {
            columns: this.getColumnState()
        };
    }


    //--------------------------
    // For Extension / Override // ??? really?
    //--------------------------
    readState(stateKey) {
        return XH.localStorageService.get(stateKey, {});
    }

    saveState(stateKey, state) {
        XH.localStorageService.set(stateKey, state);
    }

    resetState(stateKey) {
        XH.localStorageService.remove(stateKey);
    }


    loadState(state) {
        this.state = cloneDeep(state || this.readState(this.getStateKey()) || {});
        this.updateGridColumns();
    }


    //--------------------------
    // Columns
    //--------------------------
    onColumnsChanged() {
        if (this.trackColumns) {
            this.state.columns = this.getColumnState();
            this.saveStateChange();
        }
    }

    getColumnState() {
        if (!this.trackColumns) return undefined;

        const ret = [],
            gridModel = this.parent;

        gridModel.columns.forEach(it => {
            const colSpec = {
                xhId: it.xhId,
                // hidden: it.isHidden() && (!groupField || it.dataIndex != groupField)  // See Hoist #425 sencha specific?
                hide: it.hide
            };

            if (it.xhId != null) {
                ret.push(colSpec);
            }
        });

        return ret;
    }

    updateGridColumns() {
        const {parent} = this,
            state = this.state,
            cols = parent.cloneColumns(),
            newColumns = [];

        // going to need to deal with new columns and stale state here
        if (this.trackColumns && state.columns) {
            state.columns.forEach(colState => {
                const col = find(cols, {xhId: colState.xhId});
                if (!col) return;

                col.hide = colState.hide;
                newColumns.push(col);
            });

            parent.setColumns(newColumns);
        }

    }

    //--------------------------
    // Helper
    //--------------------------
    saveStateChange() {
        if (this.state && !this._resetting) { // ??
            this.saveState(this.getStateKey(), this.state);
        }
    }

    getStateKey() {
        const xhStateId = this.xhStateId;
        if (!xhStateId) {
            throw XH.exception('GridStateModel must have a xhStateId in order to store state');
        }
        return 'gridState.' + xhStateId;
    }

    ensureCompatible() {
        const cols = this.parent.columns,
            colsWithoutXhId = cols.filter(col => !col.xhId);

        if (this.trackColumns && colsWithoutXhId.length) {
            throw XH.exception('GridStateModel with "trackColumns=true" requires all columns to have an xhId');
        }
    }

}