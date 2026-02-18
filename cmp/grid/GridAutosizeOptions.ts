/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Some} from '@xh/hoist/core';
import {Column} from './columns';
import {GridAutosizeMode} from './enums/GridAutosizeMode';

export interface GridAutosizeOptions {
    /** Mode governing when resize occurs. Defaults to GridAutosizeMode.ON_SIZING_MODE_CHANGE.*/
    mode?: GridAutosizeMode;

    /**
     * Additional pixels to add to the size of each column beyond its absolute minimum.
     * May be used to adjust the spacing in the grid. Columns that wish to
     * override this value may specify `Column.autosizeBufferPx`. Default is 5.
     */
    bufferPx?: number;

    /**
     *  True to show mask over the grid during the autosize operation. Default is true.
     */
    showMask?: boolean;

    /**
     * True to limit operation to rendered rows only. Default is false.
     * Set to true for grids that contain many rows and columns, for which full autosizing
     * of all data would be too slow.
     */
    renderedRowsOnly?: boolean;

    /**
     *  True to autosize all rows, even when hidden due to a collapsed ancestor row.
     *  Only has an effect when renderedRowsOnly is false. Default is false.
     *  Note that setting this to true can have performance impacts for large tree grids with many cells.
     */
    includeCollapsedChildren?: boolean;

    /**
     * True to also autosize hidden columns.
     * Note that setting this to true can have performance impacts for grids with many columns hidden by default.
     */
    includeHiddenColumns?: boolean;

    /**
     * Columns ids to autosize, or a function for testing if the given column should be
     * autosized. Typically used when calling autosizeAsync() manually. To generally exclude
     * a column from autosizing, see the autosizable option on columns.
     */
    columns?: Some<string> | ((c: Column) => boolean);

    /**
     * How to fill remaining space after the columns have been autosized. Valid
     * options are ['all', 'left', 'right', 'none']. Default is 'none'. Note this
     * option is an advanced option that should be used with care - setting it will mean that all
     * available horizontal space will be allocated. If the grid is subsequently compressed in
     * width, or content added to it, horizontal scrolling of the columns may result that may
     * require an additional autosize.
     */
    fillMode?: string;
}
