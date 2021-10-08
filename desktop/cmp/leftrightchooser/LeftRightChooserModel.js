/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {computed, makeObservable} from '@xh/hoist/mobx';

/**
 * A Model for managing the state of a LeftRightChooser.
 */
export class LeftRightChooserModel extends HoistModel {

    /** @type {GridModel} */
    @managed leftModel;

    /** @type {GridModel} */
    @managed rightModel;

    /** @type {function} */
    onChange;

    hasDescription = false;
    leftGroupingEnabled = false;
    rightGroupingEnabled = false;
    leftGroupingExpanded = false;
    rightGroupingExpanded = false;

    _hasGrouping = null;
    _ungroupedName = null;
    _data = null;
    _lastSelectedSide = null;

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

    /** Currently 'selected' values on the right hand side. */
    @computed
    get rightValues() {
        return this.rightModel.store.allRecords.map(it => it.data.value);
    }

    /** Currently 'selected' values on the left hand side. */
    @computed
    get leftValues() {
        return this.leftModel.store.allRecords.map(it => it.data.value);
    }

    /**
     * @param {Object} c - LeftRightChooserModel configuration.
     * @param {LeftRightChooserItemDef[]} c.data - source data for both lists, split by `side`.
     * @param {function} [c.onChange] - callback for when items change sides
     * @param {string} [c.ungroupedName] - placeholder group value when an item has no group.
     * @param {?string} [c.leftTitle] - title of the left-side list.
     * @param {boolean} [c.leftSorted] - true to sort items on the left-side list.
     * @param {boolean} [c.leftGroupingEnabled] - true to enable grouping on the left-side list.
     * @param {boolean} [c.leftGroupingExpanded] - false to show a grouped left-side list with all
     *      groups initially collapsed.
     * @param {?string} [c.leftEmptyText] - text to display if left grid has no rows.
     * @param {?string} [c.rightTitle] - title of the right-side list.
     * @param {boolean} [c.rightSorted] - true to sort items on the right-side list.
     * @param {boolean} [c.rightGroupingEnabled] - true to enable grouping on the right-side list.
     * @param {boolean} [c.rightGroupingExpanded] - false to show a grouped right-side list with all
     *      groups initially collapsed.
     * @param {?string} [c.rightEmptyText] - text to display if right grid has no rows.
     * @param {boolean} [c.showCounts] - true to display the count of items on each side
     *      in the header
     */
    constructor({
        data = [],
        onChange,
        ungroupedName = 'Ungrouped',
        leftTitle = 'Available',
        leftSorted = false,
        leftGroupingEnabled = true,
        leftGroupingExpanded = true,
        leftEmptyText = null,
        rightTitle = 'Selected',
        rightSorted = false,
        rightGroupingEnabled = true,
        rightGroupingExpanded = true,
        rightEmptyText = null,
        showCounts = true
    }) {
        super();
        makeObservable(this);
        this.onChange = onChange;
        this._ungroupedName = ungroupedName;
        this.leftGroupingEnabled = leftGroupingEnabled;
        this.rightGroupingEnabled = rightGroupingEnabled;
        this.leftGroupingExpanded = leftGroupingExpanded;
        this.rightGroupingExpanded = rightGroupingExpanded;

        const store = {
            fields: [
                {name: 'text', type: 'string'},
                {name: 'value', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'group', type: 'string'},
                {name: 'side', type: 'string'},
                {name: 'locked', type: 'bool'},
                {name: 'exclude', type: 'bool'}
            ]
        };

        const leftTextCol = {
                field: 'text',
                flex: true,
                headerName: () => leftTitle + (showCounts ? ` (${this.leftModel.store.count})` : ''),
                renderer: this.getTextColRenderer('left')
            },
            rightTextCol = {
                field: 'text',
                flex: true,
                headerName: () => rightTitle + (showCounts ? ` (${this.rightModel.store.count})` : ''),
                renderer: this.getTextColRenderer('right')
            },
            groupCol = {
                field: 'group',
                headerName: 'Group',
                hidden: true
            };

        this.leftModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: leftSorted ? 'text' : null,
            emptyText: leftEmptyText,
            onRowDoubleClicked: (e) => this.onRowDoubleClicked(e),
            columns: [leftTextCol, groupCol]
        });

        this.rightModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: rightSorted ? 'text' : null,
            emptyText: rightEmptyText,
            onRowDoubleClicked: (e) => this.onRowDoubleClicked(e),
            columns: [rightTextCol, groupCol]
        });

        this.setData(data);

        this.addReaction(this.syncSelectionReaction());
    }

    setData(data) {
        const hasGrouping = data.some(it => it.group),
            lhGroupBy = (this.leftGroupingEnabled && hasGrouping) ? 'group' : null,
            rhGroupBy = (this.rightGroupingEnabled && hasGrouping) ? 'group' : null;

        this.hasDescription = data.some(it => it.description);
        this.leftModel.setGroupBy(lhGroupBy);
        this.rightModel.setGroupBy(rhGroupBy);

        this._data = this.preprocessData(data);
        this._hasGrouping = hasGrouping;
        this.refreshStores();
    }

    //------------------------
    // Implementation
    //------------------------
    getTextColRenderer(side) {
        const groupingEnabled = side === 'left' ? this.leftGroupingEnabled : this.rightGroupingEnabled,
            lockSvg = Icon.lock({prefix: 'fal', asHtml: true});

        return (v, {record}) => {
            const groupClass = groupingEnabled && this._hasGrouping ? 'xh-lr-chooser__group-row' : '';
            return `
                <div class='xh-lr-chooser__item-row ${groupClass}'>
                    ${v} ${record.data.locked ? lockSvg : ''}
                </div>
            `;
        };

    }

    preprocessData(data) {
        return data
            .filter(r => !r.exclude)
            .map(r => {
                return {
                    id: XH.genId(),
                    group: this._ungroupedName,
                    side: 'left',
                    ...r
                };
            });
    }

    onRowDoubleClicked(e) {
        if (e.data) this.moveRows([e.data]);
    }

    moveRows(rows) {
        rows.forEach(rec => {
            const {locked, side} = rec.data;
            if (locked) return;
            rec.raw.side = (side === 'left' ? 'right' : 'left');
        });

        this.refreshStores();
        if (this.onChange) this.onChange();
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
 * @property {string} [group] - grid group in which to show the item.
 * @property {string} [side] - initial side of the item - one of ['left', 'right'] - default left.
 * @property {boolean} [locked] - true to prevent the user from moving the item between sides.
 * @property {boolean} [exclude] - true to exclude the item from the chooser entirely.
 */
