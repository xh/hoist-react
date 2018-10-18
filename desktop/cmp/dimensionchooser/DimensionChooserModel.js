/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {startCase, last, isEmpty, pull, isFunction, upperFirst} from 'lodash';
import {computed, observable, action} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 *                 label: dims.map((dim) => this.fmtDim(dim)).join(' > ') // Need to allow user defined label map
 */

@HoistModel
export class DimensionChooserModel {

    @observable selectedDims = [];

    constructor(
        {
            dimensions,
            dimensionLabels,
            model,
            field
        }) {
        this.dimensions = dimensions;
        this.dimensionLabels = dimensionLabels;
        this.model = model;
        this.field = field;
        this.selectedDims = model[field].split(',');
    }

    @action
    addDimension(v) {
        this.selectedDims = v.split(',');
    }

    @action
    removeDimension(dim) {
        pull(this.selectedDims, dim);
        this.doCommit(); // What's the DRY way to do this?
    }

    @computed
    get options() {
        const {dimensions, selectedDims, fmtDim} = this,
            curIndex = isEmpty(selectedDims) ? 0 : dimensions.indexOf(last(selectedDims)) + 1,
            remainingDims = dimensions.slice(curIndex),
            opts = remainingDims.map((dim) => [...selectedDims, dim]);
        return opts.map(dims => {
            return {
                value: dims.join(','),
                label: fmtDim(last(dims)) // Need to allow user defined label map
            };
        });
    }

    doCommit() {
        const {model, field} = this;
        if (model && field) {
            const setterName = `set${upperFirst(field)}`;
            throwIf(!isFunction(model[setterName]), `Required function '${setterName}()' not found on bound model`);
            model[setterName](this.selectedDims.join(','));
        }
    }

    /** Will be used to populate history. */
    loadAsync() {
    }
    loadData() {

    }

    //------------------------
    // Implementation
    //------------------------

    fmtDim = (dim) => {
        return this.dimensionLabels ?
            this.dimensionLabels[dim] :
            startCase(dim);
    }

}
