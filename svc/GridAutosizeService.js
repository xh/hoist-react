/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistService} from '@xh/hoist/core';
import {throwIf, stripTags} from '@xh/hoist/utils/js';
import {isFunction, isNil, isFinite, sortBy, reduce} from 'lodash';

@HoistService
export class GridAutosizeService {

    _cellEl;

    autoSizeColumns({gridModel, colIds = []}) {
        throwIf(!gridModel, 'GridModel required for autosize');
        if (!colIds.length) return;

        const ret = [];
        for (let i = 0; i < colIds.length; i++) {
            const colId = colIds[i],
                width = this.autoSizeColumn({colId, gridModel});

            if (isFinite(width)) ret.push({colId, width});
        }
        return ret;
    }

    //------------------
    // Implementation
    //------------------
    autoSizeColumn({colId, gridModel}) {
        try {
            const {store} = gridModel,
                records = [...store.records, store.summaryRecord],
                column = gridModel.findColumn(gridModel.columns, colId),
                {autoSizeOptions, field, getValueFn, renderer, elementRenderer} = column,
                {enabled, sampleCount, buffer, minWidth, maxWidth} = autoSizeOptions,
                useRenderer = isFunction(renderer);

            if (!enabled) return;

            // Columns with element renderers are not supported
            if (elementRenderer) return;

            // 1) Get unique values
            const values = new Set();
            records.forEach(record => {
                if (!record) return;
                const rawValue = getValueFn({record, field, column, gridModel}),
                    value = useRenderer ? renderer(rawValue, {record, column, gridModel}) : rawValue;
                values.add(value);
            });

            // 2) Sort by string length. For columns that use renderers and may return html,
            // strip html tags but include parentheses / units etc.
            // Todo: Maybe use this: https://www.w3schools.com/tags/canvas_measuretext.asp : Maybe use this and just check max?
            const sortedValues = sortBy(Array.from(values), value => {
                return isNil(value) ? 0 : stripTags(value.toString()).length;
            });

            // 3) Extract the sample set of longest values for rendering and sizing
            const longestValues = sortedValues.slice(Math.max(sortedValues.length - sampleCount, 0));

            // 4) Render to a hidden cell to calculate the max displayed width
            const result = reduce(longestValues, (currMax, value) => {
                const width = this.getCellWidth(value, useRenderer) + buffer;
                return Math.max(currMax, width);
            }, 0);

            if (isFinite(minWidth) && result < minWidth) return minWidth;
            if (isFinite(maxWidth) && result > maxWidth) return maxWidth;
            return result;
        } catch (e) {
            console.debug(`Could not calculate width for column "${colId}".`, e);
        } finally {
            this.setCellElActive(false);
        }
    }

    getCellWidth(value, useRenderer) {
        const cellEl = this.getCellEl();
        this.setCellElActive(true);
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

    setCellElActive(active) {
        const cellEl = this.getCellEl();
        if (active) {
            cellEl.classList.add('xh-grid-autosize-cell--active');
        } else {
            cellEl.classList.remove('xh-grid-autosize-cell--active');
        }
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