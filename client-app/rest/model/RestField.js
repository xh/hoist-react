/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist';

/**
 * Meta data for field to be displayed/edited in RestGrid.
 */
class RestField {

    name
    label
    model
    isNullable
    defaultValue
    type
    lookup

    _lookupValues = null;

    constructor({
        model,
        name,
        label,
        isNullable = false,
        defaultValue = null,
        type = 'string',      // [string, long, double, boolean, json, date, day]
        lookup = null
    }) {
        this.name = name;
        this.model = model;
        this.isNullable = isNullable;
        this.defaultValue = defaultValue;
        this.type = type;
        this.lookup = lookup;
    }

    //---------------------------
    // Implementation
    //---------------------------
    async loadLookupAsync() {
        const {lookup, model} = this;
        if (lookup) {
            this._lookupValues = await XH.fetchJson({url: model.url + '/' + lookup});
        }
    }
}