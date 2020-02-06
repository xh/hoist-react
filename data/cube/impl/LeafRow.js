/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * @private
 *
 * pseudo-record used by views to gather/track leaf rows in a View
 */
export class LeafRow {

    constructor(view, rawRecord) {
        this._meta = {
            view,
            isLeaf: true
        };

        // Record data for fields of interest
        this.id = rawRecord.id;
        this.cubeLabel = rawRecord.id;
        view.fields.forEach(({name}) => {
            this[name] = rawRecord.data[name];
        });
    }
}