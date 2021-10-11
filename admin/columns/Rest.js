/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {dateTimeCol} from '@xh/hoist/cmp/grid';

const {DATE, STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const dateCreatedField = {
    name: 'dateCreated',
    type: DATE
};

export const lastUpdatedField = {
    name: 'lastUpdated',
    type: DATE
};

export const lastUpdatedByField = {
    name: 'lastUpdatedBy',
    type: STRING
};

//-----------------------
// Columns
//-----------------------
export const dateCreatedCol = {
    field: dateCreatedField,
    ...dateTimeCol
};

export const lastUpdatedCol = {
    field: lastUpdatedField,
    ...dateTimeCol
};

export const lastUpdatedByCol = {
    field: lastUpdatedByField,
    width: 160
};