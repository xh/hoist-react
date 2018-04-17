/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
import {action, autorun, computed} from 'hoist/mobx';
import {ItemRenderer} from './impl/ItemRenderer';
/**
 * A Model for managing the state of a LeftRightChooser.
 */

export class LeftRightChooserModel {
    leftModel = null;
    rightModel = null;
    descriptionEnabled = null;
    descriptionTitle = null;
    stores = [];

    _ungroupedName = null;
    _hasGrouping = false;
    _lastSelectedSide = null;
    _leftStore = null;
    _rightStore = null;

    _fields = [
        'text', 'value', 'description', 'group',
        'side', 'locked', 'exclude'
    ];

    @computed get value() {
        return this._rightStore._records;
    }

    /**
     * @param {Object[]} data, an array to be loaded as source for both lists
     *
     * The data that is loaded into the store expects the following properties:
     *      text                    (string)    Text to display as item title in the chooser.
     *      value                   (string)    The value that the item represents.
     *      description             (string)    A user-friendly description of the item.
     *      group                   (string)    Used to group the list of items.
     *      side                    (string)    ['left','right'] Which side of the chooser the item should appear in.
     *      locked                  (bool)      If item cannot be moved between sides of the chooser.
     *      exclude:                (bool)      Exclude the item from the chooser entirely.
     *
     * @param {string} ungroupedName - Group value when an item has no group
     * @param {string} descriptionTitle - Title of the description panel
     *
     * @param {string} leftTitle - Title of the left-side list
     * @param {boolean} leftGroupingEnabled - Enable grouping on the the left-side list
     * @param {Object[]} leftSortBy - One or more sorters to apply to the left-side store
     *
     * @param {string} rightTitle - Title of the right-side list
     * @param {boolean} rightGroupingEnabled - Enable grouping on the the right-side list
     * @param {Object[]} rightSortBy - One or more sorters to apply to the right-side store
     */
    constructor({
        data = [],
        ungroupedName = 'Ungrouped',
        descriptionTitle = 'Description',
        leftTitle = 'Available',
        leftGroupingEnabled = true,
        leftSortBy = [],
        rightTitle = 'Selected',
        rightGroupingEnabled = true,
        rightSortBy = []
    }) {
        this.descriptionTitle = descriptionTitle;
        this._ungroupedName = ungroupedName;

        this.loadStores(data);

        this.leftModel = new GridModel({
            store: this._leftStore,
            sortBy: leftSortBy,
            groupBy: (leftGroupingEnabled && this._hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: leftTitle, resizable: false, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', field: 'group', hide: true})
            ]
        });

        this.rightModel = new GridModel({
            store: this._rightStore,
            sortBy: rightSortBy,
            groupBy: (rightGroupingEnabled && this._hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: rightTitle, resizable: false, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', field: 'group', hide: true})
            ]
        });

        autorun(() => this.syncSelection());
    }

    @action
    loadStores(data) {
        this._leftStore = new LocalStore({
            fields: this._fields,
            filter: rec => rec.side === 'left'
        });

        this._rightStore = new LocalStore({
            fields: this._fields,
            filter: rec => rec.side === 'right'
        });

        this.stores = [this._leftStore, this._rightStore];

        if (!data.length) return;

        const normalizedData = data.map(raw => {
            if (raw.group) {
                this._hasGrouping = true;
            } else {
                raw.group = this._ungroupedName;
            }

            if (raw.description && !this.descriptionEnabled) {
                this.descriptionEnabled = true;
            }

            raw.side = raw.side || 'left';

            return raw;
        });

        const filteredData = normalizedData.filter(rec => !rec.exclude);

        this.forEachStore(store => store.loadData(filteredData));
    }

    moveSelected(side) {
        const currentSide = side === 'left' ? 'right' : 'left',
            selected = this[`${currentSide}Model`].selection.records;

        if (!selected.length) return;

        selected.forEach(rec => {
            if (rec.locked) return null;
            rec.side = side;
        });

        this.forEachStore(store => store.updateRecordInternal(selected));
    }

    syncSelection() {
        const leftSel = this.leftModel.selection.singleRecord,
            rightSel = this.rightModel.selection.singleRecord,
            currentSel = this._lastSelectedSide;

        if (leftSel && currentSel !== leftSel.side) {
            this._lastSelectedSide = 'left';
            this.rightModel.selection.select([]);
        } else if (rightSel && currentSel !== rightSel.side) {
            this._lastSelectedSide = 'right';
            this.leftModel.selection.select([]);
        }
    }

    forEachStore(fn) {
        this.stores.forEach(fn);
    }
}