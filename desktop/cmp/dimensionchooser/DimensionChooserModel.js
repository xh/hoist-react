/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {difference, isEmpty, pull, isFunction, upperFirst, pullAllWith, isEqual} from 'lodash';
import {computed, observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {

    @observable selectedDims = null;

    constructor(
        {
            model,
            field,
            dimensions,
            maxHistoryLength
        }) {
        this.model = model;
        this.field = field;
        this.dimensions = dimensions;
        this.allDims = dimensions.map(d => d.value);
        this.defaultDims = model[field];
        this.selectedDims = this.defaultDims;
        this.history = createHistoryArray({
            maxHistoryLength,
            initialValue: this.defaultDims
        });
    }

    @action
    addDim(dim, i) {
        const copy = this.selectedDims;
        pull(copy, dim);
        copy[i] = dim;
        const curDim = this.dimensions.find(d => d.value === dim);
        if (curDim.isLeafColumn) copy.splice(i + 1);
        this.selectedDims.replace(copy);
    }

    @action
    removeDim(dim) {
        pull(this.selectedDims, dim);
    }

    @action
    setDims(type) {
        const {selectedDims} = this;
        switch (type) {
            case 'reset defaults':
                selectedDims.replace(this.defaultDims);
                break;
            case 'last commit':
                selectedDims.replace(this.model[this.field]);
        }
        this.updateSelectedDims();
    }

    @action
    setDimsFromHistory(history) {
        this.selectedDims.replace(history);
        this.updateSelectedDims();
    }

    @action
    updateSelectedDims() {
        this.doCommit();
        this.history.unshift(this.selectedDims.slice());
    }

    @computed
    get remainingDims() {
        return difference(this.allDims, this.selectedDims);
    }

    @computed
    get leafSelected() {
        return this.dimensions.filter((dim) => this.selectedDims.slice().includes(dim.value) &&
        dim.isLeafColumn).length > 0;
    }

    doCommit() {
        const {model, field} = this;
        if (model && field) {
            const setterName = `set${upperFirst(field)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);
            model[setterName](this.selectedDims.slice());
        }
    }

    /** Will be used to populate history. */
    loadAsync() {
    }
    loadData() {
    }

}

const createHistoryArray = ({maxHistoryLength = 5, initialValue}) => {
    let array = [];

    array.unshift = function() {
        if (isEmpty(arguments[0])) return;                  // Don't save empty dimensions array
        pullAllWith(this, arguments, isEqual);              // Remove duplicates
        if (this.length >= maxHistoryLength) this.pop();    // Don't allow to go over max history length

        return Array.prototype.unshift.apply(this, arguments);
    };

    array.unshift(initialValue);
    return array;
};

