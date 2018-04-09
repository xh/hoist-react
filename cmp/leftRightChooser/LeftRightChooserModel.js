/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
import {action, autorun, observable} from 'hoist/mobx';
/**
 * A Model for managing the state of a LeftRightChooser.
 */

export class LeftRightChooserModel {
    @observable _leftGrouper;
    @observable _rightGrouper;
    leftModel = null;
    rightModel = null;

    _descriptionEnabled = false;
    _ungroupedName = null;
    _groupName = null;
    _lockedText = null;
    _lastSelection = null;

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


    constructor(config) {
        const {leftTitle, rightTitle} = config;
        this.updateConfig(config);

        this.leftModel = new GridModel({
            store: this._leftStore,
            sortBy: this._leftSorters,
            groupBy: this._leftGrouper,
            columns: [
                baseCol({headerName: leftTitle, resizable: false, field: 'text'})
            ]
        });

        this.rightModel = new GridModel({
            store: this._rightStore,
            sortBy: this._rightSorters,
            groupBy: this._leftGrouper,
            columns: [
                baseCol({headerName: rightTitle, resizable: false, field: 'text'})
            ]
        });

        this._leftStore.setFilter(rec => rec.side === 'left');
        this._rightStore.setFilter(rec => rec.side === 'right');
    }

    @action
    updateConfig({
        chooserData, descriptionTitle,
        ungroupedName, lockedText,
        leftGrouping, leftSorters,
        rightGrouping, rightSorters
    }) {
        this._ungroupedName = ungroupedName;
        this._leftSorters = leftSorters;
        this._rightSorters = rightSorters;
        this._lockedText = lockedText;

        this.loadStores(chooserData);
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

        this._leftStore.loadDataAsync(normalizedData.filter(rec => !rec.exclude));
        this._rightStore.loadDataAsync(normalizedData.filter(rec => !rec.exclude));
    }

    moveRecord(side) {
        const currentSide = side === 'left' ? 'right' : 'left',
            selected = this[`${currentSide}Model`].selection.singleRecord;

        if (!selected || selected.locked) return;

        selected.side = side;

        this._leftStore.updateRecordInternal(selected);
        this._rightStore.updateRecordInternal(selected);
    }

    updateSelection = autorun(() => {
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


    });
}