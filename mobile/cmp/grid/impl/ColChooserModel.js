/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {warnIf} from '@xh/hoist/utils/js';
import {clone, find, sortBy} from 'lodash';

/**
 * State management for the ColChooser component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
export class ColChooserModel extends HoistModel {

    gridModel;
    showRestoreDefaults;
    autosizeOnCommit;

    @bindable.ref columns = [];
    @bindable pinFirst;

    @observable isOpen = false;

    get pinnedColumn() {
        return this.pinFirst ? this.columns.find(it => it.pinned) : null;
    }

    get visibleColumns() {
        return this.getVisible(this.columns).filter(it => !it.pinned);
    }

    get hiddenColumns() {
        return sortBy(this.getHidden(this.columns), 'text');
    }

    constructor({
        gridModel,
        showRestoreDefaults = true,
        autosizeOnCommit = true
    }) {
        super();
        makeObservable(this);

        this.gridModel = gridModel;
        this.showRestoreDefaults = showRestoreDefaults;
        this.autosizeOnCommit = autosizeOnCommit;

        this.addReaction({
            track: () => this.pinFirst,
            run: this.updatePinnedColumn
        });
        this.addReaction({
            track: () => XH.routerState,
            run: this.close
        });
    }

    async restoreDefaultsAsync() {
        const restored = await this.gridModel.restoreDefaultsAsync();
        if (restored) {
            this.syncChooserData();
            this.close();
        }
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

    updatePinnedColumn() {
        // Loop through and, if applicable, pin the first
        // non-excluded visible column encountered
        let shouldPinFirst = this.pinFirst;
        const columns = this.columns.map(it => {
            if (it.exclude) return it;
            if (!it.hidden && shouldPinFirst) {
                shouldPinFirst = false;
                return {...it, pinned: 'left'};
            } else {
                return {...it, pinned: null};
            }
        });

        this.setColumns(columns);
    }

    setHidden(colId, hidden) {
        const columns = this.columns.map(col => {
            return (col.colId === colId && !col.locked && !col.exclude) ?
                {...col, hidden} :
                col;
        });
        this.setColumns(columns);
    }

    moveToIndex(colId, toIdx) {
        const columns = clone(this.columns),
            col = find(columns, {colId});

        if (!col || col.exclude) return;

        const fromIdx = columns.indexOf(col);
        columns.splice(toIdx, 0, columns.splice(fromIdx, 1)[0]);
        this.setColumns(columns);
    }

    commit() {
        const {columns, gridModel, autosizeOnCommit} = this;

        // Ensure excluded columns remain at their original sort idx
        const excluded = columns.filter(it => it.exclude);
        excluded.forEach(it => {
            const {colId, originalIdx} = it;
            this.moveToIndex(colId, originalIdx);
        });

        // Extract meaningful state changes
        const colChanges = columns.map(it => {
            const {colId, hidden, pinned} = it;
            return {colId, hidden, pinned};
        });

        gridModel.applyColumnStateChanges(colChanges);
        if (autosizeOnCommit) gridModel.autosizeAsync({showMask: true});
    }

    //------------------------
    // Implementation
    //------------------------
    syncChooserData() {
        const {gridModel} = this,
            cols = gridModel.getLeafColumns();

        const columns = gridModel.columnState.map(({colId}, idx) => {
            const col = gridModel.findColumn(cols, colId),
                visible = gridModel.isColumnVisible(colId),
                pinned = gridModel.getColumnPinned(colId);

            warnIf(pinned && idx > 0, 'ColChooser only supports pinning the first column. Subsequent pinned columns will be ignored.');

            return {
                originalIdx: idx,
                colId: col.colId,
                text: col.chooserName,
                hidden: !visible,
                exclude: col.excludeFromChooser,
                locked: visible && !col.hideable,
                pinned: pinned && idx === 0
            };
        });

        this.setColumns([
            ...this.getVisible(columns),
            ...this.getHidden(columns)
        ]);

        this.setPinFirst(columns.length && columns[0].pinned);
    }

    getVisible(cols) {
        return cols.filter(it => !it.hidden);
    }

    getHidden(cols) {
        return cols.filter(it => it.hidden);
    }
}
