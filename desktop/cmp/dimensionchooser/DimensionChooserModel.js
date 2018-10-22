/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {isEmpty, pull, isFunction, upperFirst, indexOf, pullAllWith, isEqual} from 'lodash';
import {computed, observable, action, toJS} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {

    @observable selectedDims = null;
    @observable history = null;

    constructor(
        {
            model,
            field,
            dimensions,
            historyLength
        }) {
        this.model = model;
        this.field = field;
        this.allDims = dimensions;
        this.defaultDims = model[field].split(',');
        this.selectedDims = this.defaultDims;
        this.historyLength = historyLength;
        this.history = [this.defaultDims];
    }

    @action
    handleDim(dim) {
        const {selectedDims} = this;

        if (selectedDims.includes(dim)) {
            pull(selectedDims, dim);
        } else {
            selectedDims.push(dim);
        }
        this.doCommit();
    }

    @action
    setDims(type) {
        const {selectedDims} = this;
        switch (type) {
            case 'reset':
                selectedDims.replace(this.defaultDims);
                break;
            case 'clear':
                selectedDims.clear();
                break;
            case 'all':
                selectedDims.replace(this.allDims);
                break;
        }
        this.doCommit();
        this.saveHistory(); // Does this make sense? Already ignoring 'clear' in saveHistory()
    }

    @action
    setDimsFromHistory(history) {
        this.selectedDims.replace(history);
        this.doCommit();
        this.saveHistory();
    }

    @action
    saveHistory() {
        if (isEmpty(this.selectedDims)) return;             // Don't save empty dimensions array

        let copy = toJS(this.history);
        pullAllWith(copy, [this.orderedDims], isEqual);     // Remove duplicates
        if (copy.length >= this.historyLength) copy.pop();  // Don't allow to go over max history length
        copy.unshift(this.orderedDims);

        this.history.replace(copy);
    }

    @computed
    get orderedDims() {
        return this.selectedDims.slice().sort((a, b) => indexOf(this.allDims, a) - indexOf(this.allDims, b));
    }

    doCommit() {
        const {model, field} = this;
        if (model && field) {
            const setterName = `set${upperFirst(field)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);
            model[setterName](this.orderedDims.join(','));
        }
    }


    /** Will be used to populate history. */
    loadAsync() {
    }
    loadData() {
    }

}

/** Unused for now... is it possible to override a mobx array method?
 *
 * const createHistoryArray = (length) => {
    const array = observable([]);

    array.unshift = function() {
        const arrayCopy = array.slice();
        if (isEmpty(arguments[0])) return;     // Don't save empty dimensions array
        pullAllWith(arrayCopy, arguments, isEqual); // Remove duplicates
        if (this.length >= length) arrayCopy.pop(); // Don't allow to go over max history length
        return Array.prototype.unshift.apply(arrayCopy, arguments);
    };

    return array;
};

 */
