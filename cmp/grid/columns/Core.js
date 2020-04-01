/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';

/**
 * Column config intended to be used as the last column in a grid that either does not have flex
 * columns of its own, or has flex columns constrained by a maxWidth (as is recommended).
 * This empty column carries row striping and borders across the entire remaining width of the grid,
 * avoiding a strange looking gap / blank space and keeping the overall layout cohesive. Special
 * handling within GridModel ensures it is maintained as the last, right-most column in the grid.
 */
export const emptyFlexCol =  {
    colId: 'emptyFlex',
    headerName: null,
    // Tiny flex value set here to avoidFlexCol competing with other flex cols in the same grid.
    // This config's goal is only to soak up *extra* width - e.g. when there are no other flex cols,
    // or when any other flex cols are constrained to a configured maxWidth.
    flex: 0.001,
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

/** Column config to render truthy values with a standardized green check icon. */
export const boolCheckCol = {
    width: 34,
    align: 'center',
    resizable: false,
    renderer: (v) => v ? Icon.check({prefix: 'fas', className: 'xh-green', asHtml: true}) : ''
};

export const numberCol = {
    align: 'right',
    renderer: numberRenderer({})
};

export const fileExtCol = {
    headerName: '',
    width: 28,
    align: 'center',
    resizable: false,
    renderer: (v) => v ? Icon.fileIcon({filename: v, title: v, asHtml: true}) : ''
};
