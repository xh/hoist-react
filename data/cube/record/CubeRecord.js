/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

export class CubeRecord {

    /** @member {Map} */
    fields;
    /** @member {CubeRecord} */
    parent = null;
    /** @member {CubeRecord[]} */
    children = null;
    /** @member {Object} */
    data = null;
    /** @member {boolean} */
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
        this.fields.forEach(fn);
    }
}

