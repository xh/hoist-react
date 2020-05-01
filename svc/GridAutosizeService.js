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
@HoistService
export class GridAutosizeService {

    _cellEl;

    async autoSizeColumnsAsync({gridModel, colIds = []}) {
        throwIf(!gridModel, 'GridModel required for autosize');
        if (!colIds.length) return;

        gridModel.agApi.showLoadingOverlay();

        await start().then(() => {
            const colStateChanges = [];

            for (let i = 0; i < colIds.length; i++) {
                const colId = colIds[i],
                    width = this.calcColumnWidth({colId, gridModel});

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
        // Todo: Handle renderers that use agParams
        if (colId === 'actions') return;

        const column = gridModel.findColumn(gridModel.columns, colId),
            {records} = gridModel.store,
            {field, getValueFn, renderer, elementRenderer} = column,
            useRenderer = isFunction(renderer);

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
        const sortedValues = sortBy(Array.from(values), value => {
            if (useRenderer) {
                return value ? stripTags(value).length : 0;
            } else {
                return value ? value.toString().length : 0;
            }
        });

        // 3) Extract the subset of up to 10 longest values for rendering and sizing
        const longestValues = sortedValues.slice(Math.max(sortedValues.length - 10, 0));

        // 4) Render to a hidden cell to determine the max rendered width
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
            cellEl.classList.add('xh-grid-autosize-cell');
            document.body.appendChild(cellEl);
            this._cellEl = cellEl;
        }
        return this._cellEl;
    }

}