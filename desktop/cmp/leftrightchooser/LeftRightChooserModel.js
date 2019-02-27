/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, managed} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {LocalStore} from '@xh/hoist/data';
import {computed} from '@xh/hoist/mobx';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import {isNil} from 'lodash';

/**
 * A Model for managing the state of a LeftRightChooser.
 */
@HoistModel
export class LeftRightChooserModel {
    /**
     * Grid Model for the left-hand side.
     * @type GridModel
     */
    @managed
    leftModel = null;

    /**
     * Grid Model for the right-hand side.
     * @type GridModel
     */
    @managed
    rightModel = null;

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
        this.leftModel.store.setFilter(fn);
        this.rightModel.store.setFilter(fn);
    }

    /** Currently 'selected' values on the right hand side. */
    @computed
    get rightValues() {
        return this.rightModel.store.allRecords.map(it => it.value);
    }

    /** Currently 'selected' values on the left hand side. */
    @computed
    get leftValues() {
        return this.leftModel.store.allRecords.map(it => it.value);
    }

    /**
     * @param {Object} c - LeftRightChooserModel configuration.
     * @param {LeftRightChooserItemDef[]} c.data - source data for both lists, split by `side`.
     * @param {string} [c.ungroupedName] - placeholder group value when an item has no group.
     * @param {?string} [c.leftTitle] - title of the left-side list.
     * @param {boolean} [c.leftSorted] - true to sort items on the left-side list.
     * @param {boolean} [c.leftGroupingEnabled] - true to enable grouping on the left-side list.
     * @param {boolean} [c.leftGroupingExpanded] - false to show a grouped left-side list with all
     *      groups initially collapsed.
     * @param {?string} [c.rightTitle] - title of the right-side list.
     * @param {boolean} [c.rightSorted] - true to sort items on the right-side list.
     * @param {boolean} [c.rightGroupingEnabled] - true to enable grouping on the right-side list.
     * @param {boolean} [c.rightGroupingExpanded] - false to show a grouped right-side list with all
     *      groups initially collapsed.
     */
    constructor({
        data = [],
        ungroupedName = 'Ungrouped',
        leftTitle = 'Available',
        leftSorted = false,
        leftGroupingEnabled = true,
        leftGroupingExpanded = true,
        rightTitle = 'Selected',
        rightSorted = false,
        rightGroupingEnabled = true,
        rightGroupingExpanded = true
    }) {
        this._ungroupedName = ungroupedName;
        this.leftGroupingEnabled = leftGroupingEnabled;
        this.rightGroupingEnabled = rightGroupingEnabled;
        this.leftGroupingExpanded = leftGroupingExpanded;
        this.rightGroupingExpanded = rightGroupingExpanded;

        const fields = ['text', 'value', 'description', 'group', 'side', 'locked', 'exclude'];

        const leftTextCol = {
                field: 'text',
                flex: true,
                headerName: leftTitle,
                renderer: this.getTextColRenderer('left')
            },
            rightTextCol = {
                field: 'text',
                flex: true,
                headerName: rightTitle,
                renderer: this.getTextColRenderer('right')
            },
            groupCol = {
                field: 'group',
                headerName: 'Group',
                hidden: true
            };

        this.leftModel = new GridModel({
            store: new LocalStore({fields}),
            selModel: 'multiple',
            sortBy: leftSorted ? 'text' : null,
            columns: [leftTextCol, groupCol]
        });

        this.rightModel = new GridModel({
            store: new LocalStore({fields}),
            selModel: 'multiple',
            sortBy: rightSorted ? 'text' : null,
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
        const groupingEnabled = side == 'left' ? this.leftGroupingEnabled : this.rightGroupingEnabled,
            lockSvg = convertIconToSvg(Icon.lock({prefix: 'fal'}));

        return (v, {record}) => {
            const groupClass = groupingEnabled && this._hasGrouping ? 'xh-lr-chooser__group-row' : '';
            return `
                <div class='xh-lr-chooser__item-row ${groupClass}'>
                    ${v} ${record.locked ? lockSvg : ''}
                </div>
            `;
        };

    }

    preprocessData(data) {
        return data
            .filter(rec => !rec.exclude)
            .map(raw => {
                raw.group = raw.group || this._ungroupedName;
                raw.side = raw.side || 'left';
                raw.id = isNil(raw.id) ? XH.genId() : raw.id;
                return raw;
            });
    }

    moveRows(rows) {
        rows.forEach(rec => {
            if (rec.locked) return;

            const rawRec = this._data.find(raw => raw === rec.raw);
            rawRec.side = (rec.side === 'left' ? 'right' : 'left');
        });

        this.refreshStores();
    }

    syncSelectionReaction() {
        const leftSel = this.leftModel.selModel,
            rightSel = this.rightModel.selModel;
        
        return {
            track: () => [leftSel.singleRecord, rightSel.singleRecord],
            run: () => {
                const lastSelectedSide = this._lastSelectedSide;
                if (leftSel.singleRecord && lastSelectedSide !== 'left') {
                    this._lastSelectedSide = 'left';
                    rightSel.clear();
                } else if (rightSel.singleRecord && lastSelectedSide !== 'right') {
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
