/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {startCase} from 'lodash';
import {computed, observable, action, runInAction} from '@xh/hoist/mobx';



@HoistModel
export class DimensionChooserModel {

    @observable selectedDims = [];

    constructor({
                    dimensions,
                }) {
        this.dimensions = dimensions;
    }

    @action
    addNewDimension(v) {
        this.selectedDims = [...this.selectedDims, v]
    }

    @computed
    get options() {
        const {dimensions, selectedDims} = this,
            curIndex = selectedDims.length,
            remainingDims = dimensions.slice(curIndex);
        const opts = remainingDims.map((dim) => [...selectedDims, dim]);
        return opts.map(dims => {
            return {
                value: dims.join(','),
                label: dims.map((dim) => startCase(dim)).join(' > ')
            }
        })
    }



    /** Load the underlying store. */
    loadAsync() {
    }

    /** Load the underlying store. */
    loadData() {

    }


    //------------------------
    // Implementation
    //------------------------

}
