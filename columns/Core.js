/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fileColFactory} from './Utils.js';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';

const colFactory = fileColFactory({
    field: null
});

export const baseCol = colFactory();

export const boolCheckCol = colFactory({
    fixedWidth: 34,
    align: 'center',
    cellRenderer: function(params) {
        return params.value ? convertIconToSvg(Icon.check({prefix: 'fas'}), {classes: ['xh-green']}) : '';
    }
});
