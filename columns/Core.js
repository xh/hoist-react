/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fileColFactory} from './Utils.js';
import {Icon} from 'hoist/icon';

const colFactory = fileColFactory({
    field: null
});

export const baseCol = colFactory();

export const boolCheckCol = colFactory({
    width: 34,
    align: 'center',
    cellRendererFramework: (params) => {
        return params.value ? Icon.check({cls: 'xh-green'}) : '';
    }
});