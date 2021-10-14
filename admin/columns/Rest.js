/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {dateTimeCol} from '@xh/hoist/cmp/grid';

const {DATE, STRING} = FieldType;

export const dateCreated = {
    field: {name: 'dateCreated', type: DATE},
    ...dateTimeCol
};

export const lastUpdated = {
    field: {name: 'lastUpdated', type: DATE},
    ...dateTimeCol
};

export const lastUpdatedBy = {
    field: {name: 'lastUpdatedBy', type: STRING},
    width: 160
};