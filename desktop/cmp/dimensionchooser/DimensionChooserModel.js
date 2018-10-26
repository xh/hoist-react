/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {isArray, isObject, difference, isEmpty, pull, isFunction, upperFirst, pullAllWith, isEqual} from 'lodash';
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
        const prefs = this.getPrefs();
        this.defaultDims = prefs.defaultDims || model[field].slice();
        this.selectedDims = this.defaultDims;
        this.history = createHistoryArray({
            maxHistoryLength,
            initialValue: prefs.initialValue || model[field].slice()
        });
    }

    getPrefs() {
        let defaultDims, initialValue = null;
        if (XH.prefService.hasKey('xhDimensionsHistory')) {
            const history = XH.prefService.get('xhDimensionsHistory');
            if (Object.keys(history).length) {
                defaultDims = history[0];
                initialValue = history;
            }
        }
        return {defaultDims, initialValue};
    }

    @action
    addDim(dim, i) {
        const {selectedDims} = this,
            copy = selectedDims.slice();

        pull(copy, dim);
        copy[i] = dim;
        if (this.toRichDim(dim).isLeafColumn) copy.splice(i + 1);

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
                break;
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
        XH.prefService.set('xhDimensionsHistory', this.history.slice());
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

    //-------------------------
    // Helpers
    //-------------------------

    get remainingDims() {
        return this.toRichDim(difference(this.allDims, this.selectedDims));
    }

    availableDims =(i) => {
        const dimChildren = this.toRichDim(this.selectedDims.slice(i + 1));
        return [...this.remainingDims, ...dimChildren];
    }

    toRichDim = (value) => {
        const {dimensions} = this,
            retFn = (val) => dimensions.find(dim => dim.value === val);
        return isObject(value) ?
            value.map((it) => retFn(it)) :
            retFn(value);
    }
}

const createHistoryArray = ({maxHistoryLength = 5, initialValue}) => {
    const array = isArray(initialValue[0]) ? [...initialValue] : [initialValue];

    array.unshift = function() {
        if (isEmpty(arguments[0])) return;                  // Don't save empty dimensions array
        pullAllWith(this, arguments, isEqual);              // Remove duplicates
        if (this.length >= maxHistoryLength) this.pop();    // Don't allow to go over max history length

        return Array.prototype.unshift.apply(this, arguments);
    };

    return array;
};

