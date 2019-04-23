/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

Ext.define('XH.cube.filter.Filter', {

    matches(record) {
        throw {name: 'Cube Filter Error', message: 'Abstract class. Not implemented.'};
    }
});