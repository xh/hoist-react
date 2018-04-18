/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
import {autorun, computed, observable, setter} from 'hoist/mobx';
import {ItemRenderer} from './impl/ItemRenderer';

/**
 * A Model for managing the state of a LeftRightChooser.
 */
export class LeftRightChooserModel {
    /** Grid Model for the left-hand side */
    leftModel = null;

    /** Grid Model for the right-hand side */
    rightModel = null;

    /** Title for description panel */
    descriptionTitle = null;

    _descriptionEnabled = null;
    _lastSelectedSide = null;
    _displayFilter = null;

    /**
     * Filter for data rows to determine if they should be shown.
     * Useful for helping users find values of interest in a large pool of rows.
     *
     * Note that this will *not* effect the actual 'value' property, which will consider
     * to include unfiltered records.
     *
     * See also LeftRightChooserFilter, for a component to easily control this field
     *
     * @param {function}
     */
    setDisplayFilter(fn) {
        this.leftModel.store.setFilter(fn);
        this.rightModel.store.setFilter(fn);
    }

    /** Currently 'Selected' values on the right hand side. */
    @computed get value() {
        return this.rightModel.store.allRecords;
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
     *      exclude                 (bool)      Exclude the item from the chooser entirely.
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

        const hasGrouping = data.any(it => it.group)
        this._hasDescription = data.any(it => it.description);

        this._data = this.preprocessData(data, ungroupedName);

        const fields = ['text', 'value', 'description', 'group', 'side', 'locked', 'exclude'];

        this.leftModel = new GridModel({
            store: new LocalStore({fields});
            sortBy: leftSortBy,
            groupBy: (leftGroupingEnabled && hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: leftTitle, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', field: 'group', hide: true})
            ]
        });

        this.rightModel = new GridModel({
            store: new LocalStore({fields});
            sortBy: rightSortBy,
            groupBy: (rightGroupingEnabled && hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: rightTitle, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', field: 'group', hide: true})
            ]
        });

        autorun(() => this.syncSelection());
    }

    //---------------
    // Implementation
    //---------------
    preprocessData(data, ungroupedName) {
        return data
            .filter(rec => !rec.exclude)
            .map(raw => {
                raw.group = raw.group || ungroupedName;
                raw.side = raw.side || 'left';
                return raw;
            });
    }

    moveRows(rows) {
        rows.forEach(rec => {
            if (!rec.locked) {
                rec.side = (rec.side == 'left' ? 'right' : 'left');
            }
        });

        this.refreshStores();
    }

    syncSelection() {
        const leftSel = this.leftModel.selection,
            rightSel = this.rightModel.selection,
            lastSelectedSide = this._lastSelectedSide;

        if (!leftSel.isEmpty && lastSelectedSide !== 'left') {
            this._lastSelectedSide = 'left';
            rightSel.clear();
        } else if (!rightSel.isEmpty && lastSelectedSide !== 'right') {
            this._lastSelectedSide = 'right';
            leftSel.clear();
        }
    }

    refreshStores() {
        const data = this._data;
        leftModel.store.loadData(data.filter(it => it.side == 'left'));
        rightModel.store.loadData(data.filter(it => it.side == 'right'));
    }
}