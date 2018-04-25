/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
import {autorun, computed} from 'hoist/mobx';

import {ItemRenderer} from './impl/ItemRenderer';

/**
 * A Model for managing the state of a LeftRightChooser.
 */
export class LeftRightChooserModel {
    /** Grid Model for the left-hand side */
    leftModel = null;

    /** Grid Model for the right-hand side */
    rightModel = null;

    /** Property to enable/disable the description panel */
    hasDescription = null;

    _lastSelectedSide = null;

    /**
     * Filter for data rows to determine if they should be shown.
     * Useful for helping users find values of interest in a large pool of rows.
     *
     * Note that this will *not* affect the actual 'value' property, which will continue
     * to include unfiltered records.
     *
     * @see LeftRightChooserFilter - a component to easily control this field.
     *
     * @param {function} fn
     */
    setDisplayFilter(fn) {
        this.leftModel.store.setFilter(fn);
        this.rightModel.store.setFilter(fn);
    }

    /** Currently 'selected' values on the right hand side. */
    @computed get value() {
        return this.rightModel.store.allRecords;
    }

    /**
     * @param {Object[]} data - source for both lists, with each item containing the properties below.
     * @param {string} data[].text - primary label for the item.
     * @param {string} data[].value - value that the item represents.
     * @param {string} data[].description - user-friendly, longer description of the item.
     * @param {string} data[].group - grid group in which to show the item.
     * @param {string} data[].side - initial side of the item.
     * @param {boolean} data[].locked - true to prevent the user from moving the item between sides.
     * @param {boolean} data[].exclude - true to exclude the item from the chooser entirely.
     *
     * @param {string} ungroupedName - placeholder group value when an item has no group.
     * @param {string} leftTitle - title of the left-side list.
     * @param {boolean} leftGroupingEnabled - true to enable grouping on the the left-side list.
     * @param {Object[]} leftSortBy - one or more sorters to apply to the left-side store.
     * @param {string} rightTitle - title of the right-side list.
     * @param {boolean} rightGroupingEnabled - true to enable grouping on the the right-side list.
     * @param {Object[]} rightSortBy - one or more sorters to apply to the right-side store.
     */
    constructor({
        data = [],
        ungroupedName = 'Ungrouped',
        leftTitle = 'Available',
        leftGroupingEnabled = true,
        leftSortBy = [],
        rightTitle = 'Selected',
        rightGroupingEnabled = true,
        rightSortBy = []
    }) {
        const hasGrouping = data.some(it => it.group);
        this.hasDescription = data.some(it => it.description);

        this._data = this.preprocessData(data, ungroupedName);

        const fields = ['text', 'value', 'description', 'group', 'side', 'locked', 'exclude'];

        this.leftModel = new GridModel({
            store: new LocalStore({fields}),
            sortBy: leftSortBy,
            groupBy: (leftGroupingEnabled && hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: leftTitle, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', field: 'group', hide: true})
            ]
        });

        this.rightModel = new GridModel({
            store: new LocalStore({fields}),
            sortBy: rightSortBy,
            groupBy: (rightGroupingEnabled && hasGrouping) ? 'group' : null,
            columns: [
                baseCol({headerName: rightTitle, field: 'text', cellRendererFramework: ItemRenderer}),
                baseCol({headerName: 'Group', field: 'group', hide: true})
            ]
        });

        this.refreshStores();

        autorun(() => this.syncSelection());
    }


    //------------------------
    // Implementation
    //------------------------
    preprocessData(data, ungroupedName) {
        return data
            .filter(rec => !rec.exclude)
            .map((raw, idx) => {
                raw.group = raw.group || ungroupedName;
                raw.side = raw.side || 'left';
                raw.id = raw.id != null ? raw.id : idx;
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

    syncSelection() {
        const leftSel = this.leftModel.selection,
            rightSel = this.rightModel.selection,
            lastSelectedSide = this._lastSelectedSide;

        if (leftSel.singleRecord && lastSelectedSide !== 'left') {
            this._lastSelectedSide = 'left';
            rightSel.clear();
        } else if (rightSel.singleRecord && lastSelectedSide !== 'right') {
            this._lastSelectedSide = 'right';
            leftSel.clear();
        }
    }

    refreshStores() {
        const data = this._data,
            {leftModel, rightModel} = this;

        leftModel.store.loadData(data.filter(it => it.side === 'left'));
        rightModel.store.loadData(data.filter(it => it.side === 'right'));
    }
}