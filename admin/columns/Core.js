/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';

const {STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const nameField = {
    name: 'name',
    type: STRING
};

export const typeField = {
    name: 'type',
    type: STRING
};

export const noteField = {
    name: 'note',
    type: STRING,
    displayName: 'Notes'
};

export const notesField = {
    name: 'notes',
    type: STRING
};

export const descriptionField = {
    name: 'description',
    type: STRING
};

//-----------------------
// Columns
//-----------------------
export const nameCol = {
    field: nameField,
    width: 200
};

export const typeCol = {
    field: typeField,
    width: 100
};

export const noteCol = {
    field: noteField,
    minWidth: 60,
    flex: true,
    tooltip: true
};

export const notesCol = {
    field: notesField,
    minWidth: 60,
    flex: true,
    tooltip: true
};

export const descriptionCol = {
    field: descriptionField,
    width: 200
};
