/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {autorun, observable, setter} from 'hoist/mobx';
import {LeftRightChooserModel} from 'hoist/cmp/leftRightChooser/LeftRightChooserModel';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 */
export class GridColumnChooserModel {

    leftRightChooserModel = null;

    @observable @setter isOpen = false;

    constructor({parent=null}) {
        this.parent = parent;
        autorun(() =>{this.syncChooserData()});
    }


    commit() {
        const grid = this.parent,
            model = this.leftRightChooserModel,
            {leftModel} = model,
            hidden = leftModel.store.allRecords.map(it=>it.value);
        grid.hideColumns(hidden);
    }


    //---------
    // implementation
    //---------
    syncChooserData() {
        const grid = this.parent,
            cols = grid.columns;

        const data = cols.map(it=> {
            return {
                value: it.field,
                text: it.text,
                description: it.description,
                locked: it.locked,
                group: it.chooserGroup,
                exclude: it.excludeFromChooser,
                side: it.hide ? 'left' : 'right'
            };
        });

        this.leftRightChooserModel = new LeftRightChooserModel({
            data: data
        });
    }
}
