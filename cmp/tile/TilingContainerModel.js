/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {observable, computed, action, makeObservable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';

/**
 * Model for a TilingContainer.
 *
 * This model takes a collection of data objects, and provides a tiling layout to display
 * them. Each `data` entry is passed to the `content` component in each tile - it is up to
 * the content to determine how to render this `data`.
 *
 * It will generate a tiling layout that attempts to compromise between having as little empty
 * space as possible, and keeping the tile width / height ratio as close to the desired ratio as possible.
 *
 * Supports a number of optional constraints on tile dimensions that can be used to produce more
 * stable layouts. These should be used judiciously, however, as each constraint limits the ability
 * of the TilingContainer to fill its available space.
 */
export class TilingContainerModel extends HoistModel {

    @observable.ref
    data;

    @observable.ref
    dimensions;

    //-----------------------
    // Immutable Properties
    //-----------------------
    content;
    emptyText;
    desiredRatio;
    spacing;
    minRatio;
    maxRatio;
    minWidth;
    maxWidth;
    minHeight;
    maxHeight;

    @computed.struct
    get layout() {
        return this.selectLayout();
    }

    /**
     * @param {Object} c - TilingContainerModel configuration.
     * @param {(ReactElement|Object|function)} c.content - Hoist Component (class or functional) to be rendered by this
     *      for each tile; or function returning react element to be rendered for each tile. Will receive `data` as a prop.
     * @param {string} [c.emptyText] - text to display when the container is empty.
     * @param {number} [c.desiredRatio] - Desired tile width / height ratio (i.e. desiredRatio: 2 == twice as wide as tall).
     *      Layouts will strive to meet this ratio, but the final ratio may vary. Defaults to 1 (i.e. square tiles).
     * @param {number} [c.spacing] - The space between tiles (in px).
     * @param {number} [c.minRatio] - Min tile ratio. Only layouts that meet this condition will be considered.
     * @param {number} [c.maxRatio] - Max tile ratio. Only layouts that meet this condition will be considered.
     * @param {number} [c.minWidth] - Min tile width (in px). Only layouts that meet this condition will be considered.
     * @param {number} [c.maxWidth] - Max tile width (in px). Only layouts that meet this condition will be considered.
     * @param {number} [c.minHeight] - Min tile height (in px). Unlike minWidth, failing to meet this condition does not
     *      automatically invalidate the layout. Instead, the container will scroll if necessary.
     * @param {number} [c.maxHeight] - Max tile height (in px). Unlike maxWidth, failing to meet this condition does not
     *      automatically invalidate the layout. Instead, the container will scroll if necessary.
     */
    constructor({
        content,
        emptyText= 'No items found...',
        desiredRatio = 1,
        spacing = 0,
        minRatio,
        maxRatio,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight
    } = {}) {
        super();
        makeObservable(this);

        this.content = content;
        this.emptyText = emptyText;
        this.desiredRatio = desiredRatio;
        this.spacing = spacing;
        this.minRatio = minRatio;
        this.maxRatio = maxRatio;
        this.minWidth = minWidth;
        this.maxWidth = maxWidth;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
    }

    /**
     * Load a new and complete dataset.
     *
     * Data is an array of objects, models, etc. For each entry, a tile will be rendered using
     * `content` and sized and placed according to the layout.
     *
     * @param {*[]} data - source data to load
     */
    @action
    loadData(data) {
        this.data = data;
    }

    @action
    onResize(dimensions) {
        this.dimensions = dimensions;
    }

    //-------------------
    // Implementation
    //-------------------
    selectLayout() {
        const count = this.data?.length,
            layouts = [];

        if (!this.dimensions || !count) return null;

        // Generate all possible tile layouts, from single column > single row.
        for (let i = 1; i <= count; i++) {
            const cols = i,
                rows = Math.ceil(count / cols);

            layouts.push(this.generateLayout(cols, rows, false));
        }

        // Choose layout with the best (i.e. lowest) score
        let layout = layouts.reduce(function(prev, current) {
            if (!current || current.score === undefined) return prev;
            return (prev.score < current.score) ? prev : current;
        }, {});

        // Fall back to single row or single column layout if unable to satisfy constraints.
        // Prefer single row if container is in a landscape orientation and single column
        // if portrait (e.g. along the side, super skinny).
        if (isEmpty(layout)) {
            const {width, height} = this.dimensions,
                colCount = height > width ? 1 : count,
                rowCount = height > width ? count : 1;
            layout = this.generateLayout(colCount, rowCount, true);
        }

        return layout;
    }

    generateLayout(cols, rows, skipConstraints = false) {
        const {
                desiredRatio,
                spacing,
                minRatio,
                maxRatio,
                minWidth,
                maxWidth,
                minHeight,
                maxHeight
            } = this,
            {width, height} = this.dimensions,
            count = this.data.length,
            emptyCount = (rows * cols) - count;

        // Calculate tile width / height
        let tileWidth = Math.floor((width - spacing) / cols) - spacing,
            tileHeight = Math.floor((height - spacing) / rows) - spacing;

        if (!skipConstraints) {
            if (minWidth && tileWidth < minWidth) return null;
            if (maxWidth && tileWidth > maxWidth) return null;
        }

        if (minHeight && tileHeight < minHeight) tileHeight = minHeight;
        if (maxHeight && tileHeight > maxHeight) tileHeight = maxHeight;

        // Calculate tile width / height ratio
        const ratio = tileWidth / tileHeight;

        if (!skipConstraints) {
            if (minRatio && ratio < minRatio) return null;
            if (maxRatio && ratio > maxRatio) return null;
        }

        // We want to compromise between having as little empty space as possible,
        // and keeping the tile ratio as close to the desired ratio as possible.
        // This heuristic generates a score for each layout, where a lower score is better.
        const ratioScore = Math.abs(desiredRatio - ratio),
            score = emptyCount > 0 ? ratioScore + Math.pow(emptyCount, 2) : ratioScore;

        return {
            count,
            rows,
            cols,
            tileWidth,
            tileHeight,
            ratio,
            ratioScore,
            score
        };
    }

    getTileStyle(idx) {
        const {spacing} = this,
            {cols, tileWidth, tileHeight} = this.layout,
            rowIdx = Math.floor(idx / cols),
            colIdx = idx - (rowIdx * cols),
            top = (tileHeight * rowIdx) + (rowIdx * spacing) + spacing,
            left = (tileWidth * colIdx) + (colIdx * spacing) + spacing;

        return {
            top,
            left,
            width: tileWidth,
            height: tileHeight,
            marginBottom: spacing
        };
    }
}