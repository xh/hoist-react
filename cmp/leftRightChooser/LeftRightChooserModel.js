/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';
import {LocalStore} from 'hoist/data';
/**
 * A Model for managing the state of a LeftRightChooser.
 */

export class LeftRightChooserModel {
    _descriptionEnabled = false;
    _store = new LocalStore({
        fields: [
            'text', 'value', 'description', 'group',
            'side', 'locked', 'exclude'
        ]
    });

    leftModel = new GridModel({
        store: this._store,
        columns: [
            baseCol({headerName: 'Left', field: 'text'})
        ]
    });

    rightModel = new GridModel({
        store: this._store,
        columns: [
            baseCol({headerName: 'Right', field: 'text'})
        ]
    });

}