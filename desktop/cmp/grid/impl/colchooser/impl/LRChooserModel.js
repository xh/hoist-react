/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {filter, isEmpty, sortBy, maxBy} from 'lodash';
import {GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {computed, makeObservable} from '@xh/hoist/mobx';


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
            .map(it => it.raw.value);
    }

    /** Currently 'deselected' values on the left-hand side. */
    @computed
    get leftValues() {
        return this.leftModel.store.allRecords.map(it => it.raw.value);
    }

    /** Currently 'selected' leaf columns on the right-hand side. */
    @computed
    get rightLeaves() {
        return sortBy(filter(this.rightModel.store.allRecords, 'raw.isLeaf'), 'data.sortOrder')
            .map(it => it.raw.value);
    }

    /** Currently 'deselected' leaf columns on the left-hand side. */
    @computed
    get leftLeaves() {
        return sortBy(filter(this.leftModel.store.allRecords, 'raw.isLeaf'), 'data.sortOrder')
            .map(it => it.raw.value);
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
        window.lrModel = this;
        const store = {
            fields: [
                {name: 'text', type: 'string'},
                {name: 'value', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'side', type: 'string'},
                {name: 'locked', type: 'bool'},
                {name: 'exclude', type: 'bool'},
                {name: 'sortOrder', type: 'int'}
            ],
            loadRootAsSummary: true
        };

        const leftTextCol = {
                field: 'text',
                flex: true,
                headerName: () => leftTitle + (showCounts ? ` (${this.leftModel.store.count})` : ''),
                renderer: this.getTextColRenderer('left'),
                sortable: false,
                isTreeColumn: true
            },
            rightTextCol = {
                field: 'text',
                flex: true,
                headerName: () => rightTitle + (showCounts ? ` (${this.rightModel.store.count})` : ''),
                renderer: this.getTextColRenderer('right'),
                sortable: false,
                isTreeColumn: true
            },
            idxCol = {
                field: 'sortOrder',
                headerName: '',
                hidden: false
            };

        this.leftModel = new GridModel({
            treeMode: true,
            store,
            selModel: 'multiple',
            sortBy: leftSorted ? 'text' : 'sortOrder',
            emptyText: leftEmptyText,
            onRowDoubleClicked: (e) => this.onRowDoubleClicked(e),
            columns: [leftTextCol]
        });

        this.rightModel = new GridModel({
            treeMode: true,
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

        this.setData(data);

        this.addReaction(
            this.syncSelectionReaction(),
            this.loadReaction()
        );
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
        return data.map(col => {
            if (col.children) {
                return {
                    side: 'left',
                    ...col,
                    children: this.preprocessData(col.children)
                };
            }
            if (!col.exclude) {
                return {
                    side: 'left',
                    ...col
                };
            }
        });
    }

    getNestingDepth(rows) {
        let count = 0;
        rows.forEach(row => row.forEachDescendant(() => count++));
        return count;
    }

    reorderData() {
        let sortOrder = 0,
            rightStore = sortBy(this.rightModel.store.rootRecords, 'raw.sortOrder');

        rightStore.forEach(rec => rec.forEachDescendant(row => {
            row.raw.sortOrder = sortOrder;
            sortOrder++;
        }));
        this.refreshStores();
    }

    split(row, toIndex, side) {
        const ancestors = sortBy(row.allAncestors, 'raw.sortOrder'),
            // make new ancestors for the moved row
            newAncestors = ancestors.map((node, idx) => {
                return {
                    id: XH.genId(),
                    side,
                    text: node.data.text,
                    name: node.data.text,
                    sortOrder: toIndex + idx + 1
                };
            });

        // make a completely new row as the child of the last ancestor
        const newChild = {
            children: row.raw.children,
            text: row.raw.text,
            description: row.raw.description,
            exclude: row.raw.exclude,
            locked: row.raw.visible,
            side,
            sortOrder: toIndex + ancestors.length + 1
        };

        if (row.raw.value) {
            newChild.id = `${newAncestors[ancestors.length - 1].id}>>${row.raw.value}`;
            newChild.value = row.raw.value;
            newChild.isLeaf = true;
        } else {
            newChild.id = `${newAncestors[ancestors.length - 1].id}>>${row.raw.name}`;
            newChild.children = row.raw.children.map((child, idx) => {
                return {
                    ...child,
                    sortOrder: toIndex + ancestors.length + idx + 2
                };
            });
        }

        if (ancestors.length === 2) {
            newAncestors[1].children = [newChild];
            // lowest ancestor is then made the parent of the next
            newAncestors[0].children = [newAncestors[1]];

            // remove the moved child row from its old ancestor
            ancestors[1].raw.children = ancestors[1].raw.children.filter(col => col.id !== row.id);
        } else {
            newAncestors[0].children = [newChild];
            ancestors[0].raw.children = ancestors[0].raw.children.filter(col => col.id !== row.id);
        }

        // put the new ancestors in _data to be refreshed
        this._data.push(newAncestors[0]);
        this.refreshStores();
    }

    appendRows(rows) {
        const rightStore = this.rightModel.store.allRecords;
        let lastSortOrder = maxBy(rightStore, rec => rec.data.sortOrder).data.sortOrder;

        const row = rows[0];
        if (!isEmpty(row.allAncestors)) {
            this.split(row, lastSortOrder + 1, 'right');
            return;
        }

        const append = row => {
            lastSortOrder++;
            row.raw.sortOrder = lastSortOrder;
        };
        rows.forEach(row => {row.forEachDescendant(append)});
    }

    shiftRows(rows, toIndex, depth) {
        const shift = row => {
            if (toIndex <= row.data.sortOrder) {
                row.raw.sortOrder += depth;
            }
        };

        rows.forEach(row => row.forEachDescendant(shift));
    }

    insertRows(rows, toIndex) {
        let idx = toIndex;

        const insert = row => {
            row.raw.sortOrder = idx;
            idx++;
        };

        rows.forEach(row => row.forEachDescendant(insert));
    }

    // accepts an array containing a single row or multiple rows
    rearrangeRows(rows, overRow = null) {
        if (!overRow) {
            this.appendRows(rows);
        } else {
            let toIndex = overRow.data.sortOrder,
                rightRoots = this.rightModel.store.rootRecords;
            const depth = this.getNestingDepth(rows);
            // shift rows by the number of rows being inserted, including nesting
            const row = rows[0];
            if (!isEmpty(row.allAncestors)) {
                const depth = row.allAncestors?.length + row.allChildren?.length + 1;
                this.shiftRows(rightRoots, toIndex, depth);
                this.split(row, toIndex, 'right');
                return;
            }
            this.shiftRows(rightRoots, toIndex, depth);
            // update inserted row sortOrders to fit within the allotted space
            this.insertRows(rows, toIndex);
        }
    }

    swapSides(rows) {

        const row = rows[0];
        if (!isEmpty(row.allAncestors)) {
            this.split(row, 0, 'left');
        }

        rows.forEach(row => {
            const {locked, side} = row.raw;
            if (locked) return;
            row.raw.side = (side === 'left' ? 'right' : 'left');
        });
        this.refreshStores();
    }

    // Row Drag Event Handlers
    onLeftDragEnd(e) {
        const rows = (e.nodes).map(r => r.data);
        if (rows[0].raw.side === 'right') {
            this.swapSides(rows);
            this.onChange?.();
        }
    }

    onRightDragEnd(e) {
        this._dropTargetId = null;
        this.rightModel.agApi.redrawRows();

        const rows = (e.nodes).map(r => r.data),
            overRow = e.overNode?.data;

        if (rows[0] === overRow) return;

        if (rows[0].raw.side === 'right') {
            // 1) Reordering rows in the right grid
            this.rearrangeRows(rows, overRow);
        } else {
            // 2) Moving row from left to right grid
            this.swapSides(rows);
            const rightStore = this.rightModel.store.allRecords,
                swapped = [];
            rows.forEach(({agId}) => {
                rightStore.forEach(row => {
                    if (agId === row.agId) swapped.push(row);
                });
            });
            this.rearrangeRows(swapped, overRow);
        }

        this.reorderData();
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
                this._dropTargetId = maxBy(rightStore, rec => rec.data.sortOrder).id;
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
            this.swapSides([e.data]);
            this.reorderData();
            this.onChange?.();
        }
    }

    loadReaction() {
        return {
            when: () => this.leftModel.isReady && this.rightModel.isReady,
            run: () => {
                const leftApi = this.leftModel.agApi,
                    rightApi = this.rightModel.agApi;

                leftApi.addRowDropZone(rightApi.getRowDropZoneParams());
                rightApi.addRowDropZone(leftApi.getRowDropZoneParams());
            }
        };
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

        const leftData = [{
                id: 'leftRoot',
                name: 'root',
                children: data.filter(it => it.side === 'left')
            }], rightData = [{
                id: 'rightRoot',
                name: 'root',
                children: data.filter(it => it.side === 'right')
            }];

        leftModel.store.loadData(leftData);
        rightModel.store.loadData(rightData);
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
