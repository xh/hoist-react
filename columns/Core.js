/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {convertIconToSvg, Icon} from '@xh/hoist/icon';

export const emptyFlexCol =  {
    colId: 'emptyFlex',
    headerName: null,
    flex: true
};

export const boolCheckCol = {
    width: 34,
    align: 'center',
    resizable: false,
    renderer: (v) => v ? convertIconToSvg(Icon.check({prefix: 'fas'}), {classes: ['xh-green']}) : ''
};
