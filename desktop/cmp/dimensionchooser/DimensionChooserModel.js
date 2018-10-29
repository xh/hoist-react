/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {isPlainObject, isArray, isObject, difference, isEmpty, pull, isFunction, upperFirst, pullAllWith, isEqual, isEqualWith} from 'lodash';
import {computed, observable, action} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {
    /*
            static propTypes = {
        Array of grid dimensions, in ordered from least to most specific
    dimensions: PT.array,
     Maximum number of dimension groupings to save in state
    maxHistoryLength: PT.number,
     Maximum number of dimensions that can be set on the grid
    maxDepth: PT.number
};
     */

    @observable selectedDims = null;
    maxHistoryLength = null;
    maxDepth = null;

    constructor(
        {
            dimensionOptions,
            maxHistoryLength = 5,
            maxDepth
        }) {
        this.dimensionOptions = this.normalizeDimensions(dimensionOptions);
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = withDefault(maxDepth, this.dimensionOptions.length);

        this.allDims = this.dimensionOptions.map(d => d.value);

        const prefs = this.loadPrefs();

        this.defaultDims = prefs.defaultDims || dimensionOptions[0];
        this.selectedDims = this.defaultDims;

        this.history = createHistoryArray({
            maxHistoryLength,
            initialValue: prefs.initialValue || dimensionOptions[0]
        });

        this.dimensions = this.defaultDims

    }

    @action
    addDim(dim, i) {
        const {selectedDims} = this,
            copy = selectedDims.slice();

        pull(copy, dim);
        copy[i] = dim;
        if (this.toRichDim(dim).isLeafColumn) copy.splice(i + 1);

        selectedDims.replace(copy);
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
                this.saveDimensions();
                break;
            case 'last commit':
                selectedDims.replace(this.dimensions);
                break;
        }
    }

    @action
    setDimsFromHistory(idx) {
        this.selectedDims.replace(this.history[idx]);
        this.saveDimensions();
    }

    saveDimensions() {
        const newDims = this.selectedDims.slice();
        this.dimensions = newDims;
        this.history.unshift(newDims);
        if (XH.prefService.hasKey('xhDimensionsHistory')) XH.prefService.set('xhDimensionsHistory', this.history);
    }


    //-------------------------
    // Implementation
    //-------------------------

    loadPrefs() {
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


    //-------------------------
    // Render helpers
    //-------------------------
    get leafSelected() {
        return this.dimensionOptions.filter((dim) => this.selectedDims.slice().includes(dim.value) &&
            dim.isLeafColumn).length > 0;
    }

    get remainingDims() {
        return this.toRichDim(difference(this.allDims, this.selectedDims));
    }

    availableDims = (i) => {
        const dimChildren = this.toRichDim(this.selectedDims.slice(i + 1));
        return [...this.remainingDims, ...dimChildren];
    }

    //-------------------------
    // Value handling
    //-------------------------

    toRichDim = (value) => {
        const {dimensionOptions} = this,
            retFn = (val) => dimensionOptions.find(dim => dim.value === val);
        return isObject(value) ?
            value.map((it) => retFn(it)) :
            retFn(value);
    }

    normalizeDimensions(dims) {
        dims = dims || [];
        return dims.map(it => this.createDimension(it));
    }

    createDimension(src) {
        const srcIsObject = isPlainObject(src);

        throwIf(
            srcIsObject && !src.hasOwnProperty('value'),
            "Select options/values provided as Objects must define a 'value' property."
        );

        return srcIsObject ?
            {label: withDefault(src.label, src.value), isLeafColumn: withDefault(src.leaf, false), ...src} :
            {label: src != null ? src.toString() : '-null-', value: src, isLeafColumn: false};
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

