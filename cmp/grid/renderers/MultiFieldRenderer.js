/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {multiFieldCell} from '../impl/MultiFieldCell';

/**
 * A grid elementRendererFn that renders a collection of additional SubFields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldConfig, with the following params:
 *
 *      {SubField[]} subFields - Array of SubField specifications to render
 *      {Column~rendererFn} [mainRenderer] - renderer for primary field.
 *      {Column~elementRendererFn} [mainElementRenderer] - elementRenderer for primary field (returns a React component).
 *
 * SubFields act as pointers to other columns that exist in the GridModel's columns collection (often hidden).
 * They will be rendered using the same rendererFn, headerName and value as the column they point to.
 *
 * SubFields are defined as objects with the following props:
 *
 *      {string} colId - Column ID to render.
 *      {boolean|string} [label] - true to include the Column's headerName as label, or string
 *
 */
export const multiFieldRenderer = (value, context) => {
    return multiFieldCell({
        value,
        context
    });
};