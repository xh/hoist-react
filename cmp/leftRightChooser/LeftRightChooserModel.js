/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
import {action, autorun} from 'hoist/mobx';
import {Icon} from 'hoist/icon';
/**
 * A Model for managing the state of a LeftRightChooser.
 */

export class LeftRightChooserModel {
    leftModel = null;
    rightModel = null;

    _lastSelection = null;
    _ungroupedName = null;
    _lockedText = null;
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

    /**
     * @param {Object[]} data, an array to be loaded as source for both lists
     *
     * The data that is loaded into the store expects the following properties:
     *      text                    (string)    Text to display as item title in the chooser.
     *      value                   (string)    The value that the item respresents.
     *      description             (string)    A user-friendly description of the item.
     *      group                   (string)    Used to group the list of items.
     *      side                    (string)    ['left','right'] Which side of the chooser the item should appear in.
     *      locked                  (bool)      If item cannot be moved between sides of the chooser.
     *      exclude:                (bool)      Exclude the item from the chooser entirely.
     *
     * @param {string} ungroupedName - Group value when an item has no group
     * @param {string} lockedText - Text to be displayed for locked items
     * @param {string} descriptionTitle - Title of the description panel
     *
     * @param {string} leftTitle - Title of the left-side list
     * @param {string} leftGroupBy - Column ID by which to group the left-side list
     * @param {Object[]} leftSortBy - One or more sorters to apply to the left-side store
     *
     * @param {string} rightTitle - Title of the right-side list
     * @param {string} rightGroupBy -Column ID by which to group the right-side list
     * @param {Object[]} rightSortBy - One or more sorters to apply to the right-side store
     */
    constructor({
        data = [],
        ungroupedName = 'Ungrouped',
        lockedText = ` ${Icon.lock({cls: 'medium-gray'})}`,
        descriptionTitle = 'Description',
        leftTitle = 'Available',
        leftGroupBy,
        leftSortBy = [],
        rightTitle = 'Selected',
        rightGroupBy,
        rightSortBy = []
    }) {
        this._ungroupedName = ungroupedName;
        this._lockedText = lockedText;

        this.leftModel = new GridModel({
            store: this._leftStore,
            sortBy: leftSortBy,
            groupBy: leftGroupBy,
            columns: [
                baseCol({headerName: leftTitle, resizable: false, field: 'text'})
            ]
        });

        this.rightModel = new GridModel({
            store: this._rightStore,
            sortBy: rightSortBy,
            groupBy: rightGroupBy,
            columns: [
                baseCol({headerName: rightTitle, resizable: false, field: 'text'})
            ]
        });

        this._leftStore.setFilter(rec => rec.side === 'left');
        this._rightStore.setFilter(rec => rec.side === 'right');

        this.loadStores(data);

        autorun(() => this.updateSelection());
    }

    @action
    loadStores(data) {
        if (!data.length) return;

        const normalizedData = data.map(it => {
            if (it.group && this._leftGrouper !== it.group) {
                this._leftGrouper = this._rightGrouper = it.group;
            } else {
                it.group = this._ungroupedName;
            }

            if (it.description && !this._descriptionEnabled) {
                this._descriptionEnabled = true;
            }

            if (!it.side) it.side = 'left';

            return it;
        });

        this._leftStore.loadData(normalizedData.filter(rec => !rec.exclude));
        this._rightStore.loadData(normalizedData.filter(rec => !rec.exclude));
    }

    moveRecord = (side) => {
        const currentSide = side === 'left' ? 'right' : 'left',
            selected = this[`${currentSide}Model`].selection.singleRecord;

        if (!selected || selected.locked) return;

        selected.side = side;

        this._leftStore.updateRecordInternal(selected);
        this._rightStore.updateRecordInternal(selected);
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