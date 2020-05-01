/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistService} from '@xh/hoist/core';
import {throwIf, stripTags} from '@xh/hoist/utils/js';
import {start, wait} from '@xh/hoist/promise';
import {isFunction, sortBy} from 'lodash';

// Todo: Take summary rows into account
// Todo: Add console.debug()
// Todo: skip hidden columns in GridModel
// Todo: This just returns an array [{colId, width}] - all about state goes in GridModel
// Todo: Resize options on column: {buffer (pixels to add), sampleCount = 10, autoSizeMaxWidth = maxWidth, min, enabled = resizable}

@HoistService
export class GridAutosizeService {

    _cellEl;

    async autoSizeColumnsAsync({gridModel, colIds = []}) {
        throwIf(!gridModel, 'GridModel required for autosize');
        if (!colIds.length) return;

        // Todo: Move GridModel
        gridModel.agApi.showLoadingOverlay();

        await start().then(() => {
            const colStateChanges = [];

            for (let i = 0; i < colIds.length; i++) {
                const colId = colIds[i],
                    width = this.calcColumnWidth({colId, gridModel});

                // Todo: Check width isFinite
                colStateChanges.push({colId, width});
            }

            gridModel.applyColumnStateChanges(colStateChanges);
        });
        await wait(100);

        gridModel.agApi.hideOverlay();
    }

    //------------------
    // Implementation
    //------------------
    calcColumnWidth({colId, gridModel}) {
        // Todo: Handle renderers that use agParams.
        // Todo: Make no-op if any exception thrown
        if (colId === 'actions') return;

        const column = gridModel.findColumn(gridModel.columns, colId),
            {records} = gridModel.store,
            {field, getValueFn, renderer, elementRenderer} = column,
            useRenderer = isFunction(renderer);

        // Todo: Respect 'resizable'
        if (elementRenderer) return;

        // 1) Get unique values
        const values = new Set();
        records.forEach(record => {
            const rawValue = getValueFn({record, field, column, gridModel}),
                value = useRenderer ? renderer(rawValue, {record, column, gridModel}) : rawValue;
            values.add(value);
        });

        // 2) Sort by string length. For columns that use renderers and may return html,
        // strip html tags but include parentheses / units etc.
        // Todo: Maybe use this: https://www.w3schools.com/tags/canvas_measuretext.asp : Maybe use this and just check max?
        const sortedValues = sortBy(Array.from(values), value => {
            if (useRenderer) {
                // Todo: isNil - don't want to skip falsy bool / numbers
                return value ? stripTags(value.toString()).length : 0;
            } else {
                return value ? value.toString().length : 0;
            }
        });

        // 3) Extract the subset of up to 10 longest values for rendering and sizing
        const longestValues = sortedValues.slice(Math.max(sortedValues.length - 10, 0));

        // 4) Render to a hidden cell to determine the max rendered width
        // Todo: is there a lodash max method?
        let maxWidth = 0;
        longestValues.forEach(value => {
            const width = this.getCellWidth(value, useRenderer);
            maxWidth = Math.max(maxWidth, width);
        });

        return maxWidth;
    }

    getCellWidth(value, useRenderer) {
        const cellEl = this.getCellEl();
        if (useRenderer) {
            cellEl.innerHTML = value;
        } else if (cellEl.firstChild?.nodeType === 3) {
            // If we're not rendering html and the cell's first child is already a TextNode,
            // we can update it's data to avoid creating a new TextNode.
            cellEl.firstChild.data = value;
        } else {
            cellEl.innerText = value;
        }
        return Math.ceil(cellEl.clientWidth);
    }

    getCellEl() {
        if (!this._cellEl) {
            const cellEl = document.createElement('div');
            // Todo: Use id rather than class - we only have 1
            cellEl.classList.add('xh-grid-autosize-cell');
            document.body.appendChild(cellEl);
            this._cellEl = cellEl;
        }
        return this._cellEl;
    }

}