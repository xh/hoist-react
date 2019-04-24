/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

export class Filter {

    matches(record) {
        throw {name: 'Cube Filter Error', message: 'Abstract class. Not implemented.'};
    }
}