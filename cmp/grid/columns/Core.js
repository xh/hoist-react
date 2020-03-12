/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Icon} from '@xh/hoist/icon';
import {numberRenderer} from '@xh/hoist/format';


export const emptyFlexCol =  {
    colId: 'emptyFlex',
    headerName: null,
    flex: true,
    minWidth: 0,
    movable: false,
    resizable: false,
    sortable: false,
    excludeFromChooser: true,
    excludeFromExport: true,
    agOptions: {
        filter: false,
        suppressMenu: true
    }
};

export const boolCheckCol = {
    width: 34,
    align: 'center',
    resizable: false,
    renderer: (v) => v ? Icon.check({prefix: 'fas', className: 'xh-green', asSvg: true}) : ''
};

export const numberCol = {
    align: 'right',
    renderer: numberRenderer()
};

export const fileExtCol = {
    headerName: '',
    width: 28,
    align: 'center',
    resizable: false,
    renderer: (v) => v ? Icon.fileIcon({filename: v, title: v, asSvg: true}) : ''
};
