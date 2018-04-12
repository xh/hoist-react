/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
import {action, autorun, computed, toJS} from 'hoist/mobx';
import {ItemRenderer} from './ItemRenderer';
/**
 * A Model for managing the state of a LeftRightChooser.
 */

export class LeftRightChooserModel {
    leftModel = null;
    rightModel = null;
    stores = [];

    _lastSelection = null;
    _ungroupedName = null;
    _hasGrouping = false;
    _fields = [
        'text', 'value', 'description', 'group',
        'side', 'locked', 'exclude'
    ];

    _leftStore = new LocalStore({
        fields: this._fields
    });

    _rightStore = new LocalStore({
        fields: this._fields
    });

    @computed get value() {
        return toJS(this._rightStore._records);
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
     * @param {boolean} leftGrouping - Enable grouping on the the left-side list
     * @param {Object[]} leftSortBy - One or more sorters to apply to the left-side store
     *
     * @param {string} rightTitle - Title of the right-side list
     * @param {boolean} rightGrouping - Enable grouping on the the right-side list
     * @param {Object[]} rightSortBy - One or more sorters to apply to the right-side store
     */
    constructor({
        data = [],
        ungroupedName = 'Ungrouped',
        descriptionTitle = 'Description',
        leftTitle = 'Available',
        leftGrouping = true,
        leftSortBy = [],
        rightTitle = 'Selected',
        rightGrouping = true,
        rightSortBy = []
    }) {
        const {_leftStore: leftStore, _rightStore: rightStore} = this;

        this.stores = [leftStore, rightStore];
        this._ungroupedName = ungroupedName;

        leftStore.setFilter(rec => rec.side === 'left');
        rightStore.setFilter(rec => rec.side === 'right');

        this.loadStores(data);

        this.leftModel = new GridModel({
            store: leftStore,
            sortBy: leftSortBy,
            groupBy: (leftGrouping && this._hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: leftTitle, resizable: false, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', resizable: false, field: 'group', hide: true})
            ]
        });

        this.rightModel = new GridModel({
            store: rightStore,
            sortBy: rightSortBy,
            groupBy: (rightGrouping && this._hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: rightTitle, resizable: false, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', resizable: false, field: 'group', hide: true})
            ]
        });

        autorun(() => this.updateSelection());
    }

    @action
    loadStores(data) {
        if (!data.length) return;

        const normalizedData = data.map(it => {
            if (it.group) {
                this._hasGrouping = true;
            } else {
                it.group = this._ungroupedName;
            }

            if (it.description && !this._descriptionEnabled) {
                this._descriptionEnabled = true;
            }

            if (!it.side) it.side = 'left';

            return it;
        });

        this.stores.forEach(store => store.loadData(normalizedData.filter(rec => !rec.exclude)));
    }

    moveRecord = (side) => {
        const currentSide = side === 'left' ? 'right' : 'left',
            selected = this[`${currentSide}Model`].selection.singleRecord;

        if (!selected || selected.locked) return;

        selected.side = side;

        this.stores.forEach(store => store.updateRecordInternal(selected));
    }

    updateSelection() {
        const leftSel = this.leftModel.selection.singleRecord,
            rightSel = this.rightModel.selection.singleRecord,
            currentSel = this._lastSelection || {};

        if (leftSel && currentSel.id !== leftSel.id) {
            this._lastSelection = leftSel;
            this.rightModel.selection.select([]);
        } else if (rightSel && currentSel.id !== rightSel.id) {
            this._lastSelection = rightSel;
            this.leftModel.selection.select([]);
        }
    }
}