/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {filter, isEmpty, sortBy, maxBy, includes} from 'lodash';
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
        this.merge();
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

    // accepts an array containing a single row or multiple rows
    rearrangeRows(rows, overRow = null) {
        if (!overRow) {
            this.appendRows(rows);
        } else {
            let toIndex = overRow.data.sortOrder,
                rightRoots = this.rightModel.store.rootRecords;
            const row = rows[0],
                splitting = !isEmpty(row.allAncestors) && (row.parentId !== overRow.parentId),
                depth = splitting ?
                    row.allAncestors?.length + this.getNestingDepth([row]) :
                    this.getNestingDepth(rows);
            // shift rows by the number of rows being inserted, including nesting
            this.shiftRows(rightRoots, toIndex, depth);
            if (splitting) {
                // split a nested row
                this.split(row, toIndex, 'right');
            } else {
                // update inserted row sortOrders to fit within the allotted space
                this.insertRows(rows, toIndex);
            }
        }
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

    split(row, toIndex, side) {
        // 1) generate a new node and ancestors
        const ancestors = sortBy(row.allAncestors, 'raw.sortOrder'),
            newAncestors = this.makeNewAncestors(row, toIndex, side, ancestors),
            newNode = this.makeNewNode(row, toIndex, side, newAncestors);

        let data = this._data;

        // 2) append the new node to the new ancestors
        newAncestors[newAncestors.length - 1].children = [newNode];

        // 3) remove the original node row from its previous ancestor
        ancestors[ancestors.length - 1].raw.children = filter(
            ancestors[ancestors.length - 1].raw.children,
            (col => col.id !== row.id)
        );

        // 4) remove any drifting nodes
        let rootId = ancestors[0].id,
            root = filter(data, row => row.id === rootId)[0];

        if (isEmpty(root?.children)) {
            data = filter(data, row => row.id !== rootId);
        } else {
            root.children = this.removeNodes(root);
        }

        // 5) put the new ancestors in _data to be refreshed
        data.push(newAncestors[0]);
        this._data = data;

        this.refreshStores();
    }

    merge() {
        let data = sortBy(this._data, 'sortOrder'),
            idsToDelete = [],
            rowOne,
            rowTwo;

        for (let i = 0; i < data.length - 1; i++) {
            rowOne = data[i];
            rowTwo = data[i + 1];
            // TODO: better method for equality
            if (rowOne.text === rowTwo.text) {
                rowOne.children.push(...rowTwo.children);
                rowOne.children = this.mergeRecursive(rowOne.children);
                idsToDelete.push(rowTwo.id);
            }
        }

        function isObsolete(row) {
            // row is a non-leaf node without children
            return !row.isLeaf && isEmpty(row.children);
        }

        this._data = filter(data, row => !includes(idsToDelete, row.id) && !isObsolete(row));

        this.refreshStores();
    }

    mergeRecursive(rows) {
        let idsToDelete = [],
            rowOne,
            rowTwo;
        for (let i = 0; i < rows.length - 1; i++) {
            for (let j = i + 1; j < rows.length; j++) {
                rowOne = rows[i];
                rowTwo = rows[j];
                if (rowOne.text === rowTwo.text) {
                    rowOne.children.push(...rowTwo.children);
                    if (!isEmpty(rowOne.children)) rowOne.children = this.mergeRecursive(rowOne.children);
                    rowOne.children = this.reorderChildren(rowOne.children, rowOne.sortOrder);
                    idsToDelete.push(rowTwo.id);
                }
            }
        }

        return isEmpty(idsToDelete) ? rows : filter(rows, row => !includes(idsToDelete, row.id));
    }

    shiftRows(rows, toIndex, depth) {
        const shift = row => {
            if (row.data.sortOrder >= toIndex) {
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

    makeNewAncestors(row, toIndex, side, ancestors) {
        const newAncestors = ancestors.map((row, idx) => {
            return {
                id: XH.genId(),
                side,
                text: row.data.text,
                name: row.data.text,
                sortOrder: toIndex + idx
            };
        });

        for (let i = 0; i < ancestors.length - 1; i++) {
            newAncestors[i].children = [newAncestors[i + 1]];
        }

        return newAncestors;
    }

    makeNewNode(row, toIndex, side, ancestors) {
        const {isLeaf, children, text, value, exclude, locked, description, name} = row.raw,
            nextAncestor = ancestors[ancestors.length - 1],
            newNode = {
                children: children,
                text: text,
                side,
                sortOrder: toIndex + ancestors.length
            };

        if (isLeaf) {
            newNode.id = `${nextAncestor.id}>>${value}`;
            newNode.value = value;
            newNode.isLeaf = true;
            newNode.description = description;
            newNode.exclude = exclude;
            newNode.locked = locked;
        } else {
            newNode.id = `${nextAncestor.id}>>${name}`;
            newNode.children = this.reorderChildren(children, toIndex + ancestors.length);
        }

        return newNode;
    }

    removeNodes(root) {
        let idsToDelete = [];
        root.children.forEach(row => {
            if (!row.isLeaf) {
                if (isEmpty(row.children)) {
                    idsToDelete.push(row.id);
                } else {
                    row.children = this.removeNodes(row);
                }
            }
        });

        return filter(root.children, row => !includes(idsToDelete, row.id));
    }

    reorderChildren(children, toIndex) {
        let sortOrder = toIndex;

        function traverse(children) {
            return children.map((child, idx) => {
                sortOrder += idx;
                child.sortOrder = sortOrder;
                if (!isEmpty(child.children)) {
                    child.children = traverse(child.children, sortOrder);
                }
                return child;
            });
        }

        return traverse(children);
    }

    // TODO: may cause problems with selecting multiple nested rows?
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
