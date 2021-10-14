/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';

const {STRING} = FieldType;

export const name = {
    field: {name: 'name', type: STRING},
    width: 200
};

export const type = {
    field: {name: 'type', type: STRING},
    width: 100
};

export const description = {
    field: {name: 'description', type: STRING},
    width: 200
};

export const notes = {
    field: {name: 'notes', type: STRING},
    minWidth: 60,
    flex: true,
    tooltip: true
};

export const note = {
    field: {
        name: 'note',
        type: STRING,
        displayName: 'Notes'
    },
    minWidth: 60,
    flex: true,
    tooltip: true
};