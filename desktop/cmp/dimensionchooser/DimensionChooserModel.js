/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {startCase, last, isEmpty, pull, isFunction, upperFirst, indexOf, difference} from 'lodash';
import {computed, observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {

    @observable selectedDims = [];

    constructor(
        {
            dimensions,
            model,
            field
        }) {
        this.model = model;
        this.field = field;
        this.allDims = dimensions;
        this.defaultDims = model[field].split(',');
        this.selectedDims = this.defaultDims;
        this.history = createHistoryArray(5);
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
      this.history.unshift(this.orderedDims);
    }

    @action
    setDims(type) {
        const {selectedDims} = this;
        switch(type) {
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
    }

    @action
    setDimsFromHistory(history) {
        this.selectedDims.replace(history);
        this.doCommit();
        this.history.unshift(this.orderedDims);
    }

    @computed
    get orderedDims() {
        return this.selectedDims.slice().sort((a,b) => indexOf(this.allDims, a) - indexOf(this.allDims, b));
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

const createHistoryArray = (length) => {
    const array = [];

    array.unshift = function () {
        if (this.length >= length) {
            this.pop();
        }
        return Array.prototype.unshift.apply(this, arguments);
    };

    return array;
};