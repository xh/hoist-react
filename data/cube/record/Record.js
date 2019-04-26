/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {forEach} from 'lodash';

export class Record {

    fields = null;
    parent = null;
    children = null;
    data = null;

    isLeaf = true;

    constructor(fields, data, id) {
        this.fields = fields;

        if (data) {
            const myData = {id, cubeLabel: id};
            this.eachField((field, name) => {
                myData[name] = data[name];
            });
            this.data = myData;
        }
    }

    get id()        {return this.data.id}
    get(fieldName)  {return this.data[fieldName]}

    eachField(fn) {
        return forEach(this.fields, fn);
    }
}

