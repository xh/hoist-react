/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {convertIconToSvg, fileIcon, Icon} from '@xh/hoist/icon';
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
        suppressMenu: true,
        suppressFilter: true
    }
};

export const boolCheckCol = {
    width: 34,
    align: 'center',
    resizable: false,
    renderer: (v) => v ? convertIconToSvg(Icon.check({prefix: 'fas'}), {classes: ['xh-green']}) : ''
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
    renderer: (v) => convertIconToSvg(fileIcon(v))
};
