/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';

const {STRING} = FieldType;

export const logName = {
    field: {
        name: 'name',
        type: STRING,
        displayName: 'Log Name'
    },
    width: 400
};

export const level = {
    field: {
        name: 'level',
        type: STRING,
        displayName: 'Override'
    },
    width: 110
};

export const defaultLevel = {
    field: {
        name: 'defaultLevel',
        type: STRING,
        displayName: 'Initial'
    },
    width: 110
};

export const effectiveLevel = {
    field: {
        name: 'effectiveLevel',
        type: STRING,
        displayName: 'Effective'
    },
    width: 110
};
