/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {multiFieldRenderer as multiFieldRendererImpl} from '../impl/MultiFieldRenderer';

/**
 * An grid elementRendererFn that renders a collection of additional sub fields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldRendererCfg, with the following params:
 *
 *      {Column~rendererFn} [mainRenderer] - renderer for primary field.
 *      {Column~elementRendererFn} [mainElementRenderer] - elementrenderer for primary field (returns a React component).
 *      {SubField[]} subFields - Array of SubField specifications to render
 */
export const multiFieldRenderer = (value, {record, column, agParams, gridModel}) => {
    const {multiFieldRendererCfg} = column;

    throwIf(!multiFieldRendererCfg, 'Columns using MultiFieldRenderer must specify a multiFieldRendererCfg');

    return multiFieldRendererImpl({
        value,
        record,
        column,
        agParams,
        gridModel,
        ...multiFieldRendererCfg
    });
};