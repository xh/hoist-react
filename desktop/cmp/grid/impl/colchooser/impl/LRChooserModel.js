/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {filter, sortBy, maxBy} from 'lodash';


/**
 * A Model for managing the state of a LeftRightChooser.
 */
export class LRChooserModel extends HoistModel {

    /** @type {GridModel} */
    @managed leftModel;

    /** @type {GridModel} */
    @managed rightModel;

    /** @type {function} */
    onChange;

    hasDescription = false;

    _data = null;
    _lastSelectedSide = null;
    _inRightGrid = false;
    _dropTargetId = null;
    _dropEdge = null;

    /**
     * Filter for data rows to determine if they should be shown.
     * Useful for helping users find values of interest in a large pool of rows.
     *
     * Note that this will *not* affect the actual 'value' property, which will continue
     * to include unfiltered records.
     *
     * @see LeftRightChooserFilter - a component to easily control this field.
     * @param {function} fn - predicate function for filtering.
     */
    setDisplayFilter(fn) {
        const filter = fn ? {key: this.xhId, testFn: fn} : null;
        this.leftModel.store.setFilter(filter);
        this.rightModel.store.setFilter(filter);
    }

    /** Currently 'selected' values on the right-hand side. */
    @computed
    get rightValues() {
        return sortBy(this.rightModel.store.allRecords, 'data.sortOrder')
            .map(it => it.data.value);
    }

    /** Currently 'selected' values on the left-hand side. */
    @computed
    get leftValues() {
        return this.leftModel.store.allRecords.map(it => it.data.value);
    }

    /**
     * @param {Object} c - LrChooserModel configuration.
     * @param {LeftRightChooserItemDef[]} c.data - source data for both lists, split by `side`.
     * @param {function} [c.onChange] - callback for when items change sides
     * @param {?string} [c.leftTitle] - title of the left-side list.
     * @param {boolean} [c.leftSorted] - true to sort items on the left-side list.
     * @param {?string} [c.leftEmptyText] - text to display if left grid has no rows.
     * @param {?string} [c.rightTitle] - title of the right-side list.
     * @param {boolean} [c.rightSorted] - true to sort items on the right-side list.
     * @param {?string} [c.rightEmptyText] - text to display if right grid has no rows.
     * @param {boolean} [c.showCounts] - true to display the count of items on each side
     *      in the header
     */
    constructor({
                    data = [],
                    onChange,
                    leftTitle = 'Available',
                    leftSorted = false,
                    leftEmptyText = null,
                    rightTitle = 'Selected',
                    rightSorted = false,
                    rightEmptyText = null,
                    showCounts = true
                }) {
        super();
        makeObservable(this);
        this.onChange = onChange;
        const store = {
            fields: [
                {name: 'text', type: 'string'},
                {name: 'value', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'side', type: 'string'},
                {name: 'locked', type: 'bool'},
                {name: 'exclude', type: 'bool'},
                {name: 'sortOrder', type: 'int'}
            ]
        };

        const leftTextCol = {
                field: 'text',
                flex: true,
                headerName: () => leftTitle + (showCounts ? ` (${this.leftModel.store.count})` : ''),
                renderer: this.getTextColRenderer('left'),
                sortable: false
            },
            rightTextCol = {
                field: 'text',
                flex: true,
                headerName: () => rightTitle + (showCounts ? ` (${this.rightModel.store.count})` : ''),
                renderer: this.getTextColRenderer('right'),
                sortable: false
            },
            idxCol = {
                field: 'sortOrder',
                headerName: '',
                hidden: true
            };

        this.leftModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: leftSorted ? 'text' : 'sortOrder',
            emptyText: leftEmptyText,
            onRowDoubleClicked: (e) => this.onRowDoubleClicked(e),
            columns: [leftTextCol]
        });

        this.rightModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: rightSorted ? 'text' : 'sortOrder',
            emptyText: rightEmptyText,
            onRowDoubleClicked: (e) => this.onRowDoubleClicked(e),
            columns: [idxCol, rightTextCol],
            rowClassRules: {
                'xh-lr-chooser__drop-above': ({data}) => {
                    return data.id === this._dropTargetId && this._dropEdge === 'above';
                },
                'xh-lr-chooser__drop-below': ({data}) => {
                    return data.id === this._dropTargetId && this._dropEdge === 'below';
                }
            }
        });

        this.addReaction({
            when: () => this.leftModel.isReady && this.rightModel.isReady,
            run: () => {
                const leftApi = this.leftModel.agApi,
                    rightApi = this.rightModel.agApi;

                leftApi.addRowDropZone(rightApi.getRowDropZoneParams());
                rightApi.addRowDropZone(leftApi.getRowDropZoneParams());
            }
        });

        this.setData(data);

        this.addReaction(this.syncSelectionReaction());
    }

    setData(data) {
        this.hasDescription = data.some(it => it.description);
        this._data = this.preprocessData(data);
        this.refreshStores();
    }

    //------------------------
    // Implementation
    //------------------------
    getTextColRenderer() {
        const lockSvg = Icon.lock({prefix: 'fal'});

        return (v, {record}) => {
            return div({
                className: 'xh-lr-chooser__item-row',
                items: [v, record.data.locked ? lockSvg : null]
            });
        };
    }

    preprocessData(data) {
        return data
            .filter(r => !r.exclude)
            .map((r) => {
                return {
                    id: XH.genId(),
                    side: 'left',
                    ...r
                };
            });
    }

    reorderData() {
        let rightRaw = filter(this._data, {side: 'right'});
        rightRaw = sortBy(rightRaw, 'sortOrder');
        rightRaw.forEach((r, idx) => {
            r.sortOrder = idx;
        });
        this.refreshStores();
    }

    insertRows(rows, overRow = null) {
        if (!overRow) {
            rows.forEach((rec, idx) => {
                rec.raw.sortOrder = ((this._data.length + 1) + idx);
            });
        } else {
            const toIndex = overRow.raw.sortOrder;
            let rightRaw = filter(this._data, {side: 'right'});
            rightRaw.forEach(r => {
                if (toIndex <= r.sortOrder) r.sortOrder += rows.length;
            });
            rows.forEach((rec, idx) => {
                rec.raw.sortOrder = (toIndex + idx);
            });
        }
    }

    moveRows(rows) {
        rows.forEach(rec => {
            const {locked, side} = rec.data;
            if (locked) return;
            rec.raw.side = (side === 'left' ? 'right' : 'left');
        });
        this.refreshStores();
    }

    // Row Drag Event Handlers
    onLeftDragEnd(e) {
        const rows = (e.nodes).map(r => r.data);
        if (rows[0].data.side === 'right') {
            this.moveRows(rows);
            this.onChange?.();
        }
    }

    onRightDragEnd(e) {
        this._dropTargetId = null;
        this.rightModel.agApi.redrawRows();
        const rows = (e.nodes).map(r => r.data),
            overRow = e.overNode?.data;
        if (rows[0] === overRow) return;
        if (rows[0].data.side === 'right') {
            // 1) Reordering rows in the right grid
            this.insertRows(rows, overRow);
            this.reorderData();
        } else {
            // 2) Moving row from left to right grid
            this.moveRows(rows);
            this.insertRows(rows, overRow);
            this.reorderData();
        }
        this._inRightGrid = false;
        this.onChange?.();
    }

    onRowDragMove(e) {
        if (!this._inRightGrid) {
            this._dropTargetId = null;
        } else {
            const dropRow = e.overNode?.data;
            if (dropRow) {
                this._dropTargetId = dropRow.id;
                this._dropEdge = 'above';
            } else {
                const rightStore = this.rightModel.store.allRecords;
                this._dropTargetId = maxBy(rightStore, r => r.data.sortOrder).id;
                this._dropEdge = 'below';
            }
        }
        this.rightModel.agApi.redrawRows();
    }

    onRightDragEnter() {
        this._inRightGrid = true;
    }

    onRightDragLeave() {
        this._inRightGrid = false;
        this._dropTargetId = null;
        this.rightModel.agApi.redrawRows();
    }

    onRowDoubleClicked(e) {
        if (e.data) {
            this.moveRows([e.data]);
            this.onChange?.();
        }
    }

    syncSelectionReaction() {
        const leftSel = this.leftModel.selModel,
            rightSel = this.rightModel.selModel;

        return {
            track: () => [leftSel.selectedRecord, rightSel.selectedRecord],
            run: () => {
                const lastSelectedSide = this._lastSelectedSide;
                if (leftSel.selectedRecord && lastSelectedSide !== 'left') {
                    this._lastSelectedSide = 'left';
                    rightSel.clear();
                } else if (rightSel.selectedRecord && lastSelectedSide !== 'right') {
                    this._lastSelectedSide = 'right';
                    leftSel.clear();
                }
            }
        };
    }

    refreshStores() {
        const data = this._data,
            {leftModel, rightModel} = this;

        leftModel.store.loadData(data.filter(it => it.side === 'left'));
        rightModel.store.loadData(data.filter(it => it.side === 'right'));
    }
}

/**
 * @typedef {Object} LeftRightChooserItemDef - data record object for a LeftRightChooser value item.
 * @property {string} text - primary label for the item.
 * @property {string} value - value that the item represents.
 * @property {string} [description] - user-friendly, longer description of the item.
 * @property {string} [side] - initial side of the item - one of ['left', 'right'] - default left.
 * @property {boolean} [locked] - true to prevent the user from moving the item between sides.
 * @property {boolean} [exclude] - true to exclude the item from the chooser entirely.
 */
