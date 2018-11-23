/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {multiFieldCell} from '../impl/MultiFieldCell';

/**
 * A grid elementRendererFn that renders a collection of additional sub fields in a row beneath the main column field.
 *
 * Requires the column to also specify a multiFieldRendererCfg, with the following params:
 *
 *      {SubField[]} subFields - Array of SubField specifications to render
 *      {Column~rendererFn} [mainRenderer] - renderer for primary field.
 *      {Column~elementRendererFn} [mainElementRenderer] - elementRenderer for primary field (returns a React component).
 */
export const multiFieldRenderer = (value, rendererMetadata) => {
    return multiFieldCell({
        value,
        rendererMetadata
    });
};