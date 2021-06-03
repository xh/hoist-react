/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useLocalModel, HoistModel} from '@xh/hoist/core';
import {frame, box} from '@xh/hoist/cmp/layout';
import {useOnResize} from '@xh/hoist/utils/react';
import {useState} from 'react';
import {minBy, isEqual} from 'lodash';
import composeRefs from '@seznam/compose-react-refs';
import PT from 'prop-types';
import {Children} from 'react';

import './TileFrame.scss';

/**
 * This component renders its children as equally-sized tiles, resized and arranged to fill the
 * available space within the container while maintaining even padding between tiles and keeping
 * tile width / height as close to a specified ratio as possible.
 *
 * Supports a number of optional constraints on tile dimensions that can be used to produce more
 * stable layouts. These should be used judiciously, however, as each constraint limits the ability
 * of the TileFrame to fill its available space.
 */
export const [TileFrame, tileFrame] = hoistCmp.withFactory({
    displayName: 'TileFrame',
    model: false, memo: false, observer: false,

    className: 'xh-tile-frame',

    render({
        children,
        desiredRatio = 1,
        spacing = 0,
        minTileRatio = 0.25,
        maxTileRatio = 4.0,
        minTileWidth,
        maxTileWidth,
        minTileHeight,
        maxTileHeight,
        ...props
    }, ref) {
        const localModel = useLocalModel(() => new LocalModel()),
            [width, setWidth] = useState(),
            [height, setHeight] = useState();

        children = Children.toArray(children);

        localModel.setParams({
            count: children.length,
            width,
            height,
            desiredRatio,
            spacing,
            minTileRatio,
            maxTileRatio,
            minTileWidth,
            maxTileWidth,
            minTileHeight,
            maxTileHeight
        });

        ref = composeRefs(
            ref,
            useOnResize(({width, height}) => {
                setWidth(width);
                setHeight(height);
            }, {debounce: 100})
        );

        const items = localModel.layout ?
            children.map((item, idx) => box({
                style: localModel.getTileStyle(idx),
                className: 'xh-tile-frame__tile',
                item
            })):
            null;

        return frame({ref, ...props, items});
    }
});

TileFrame.propTypes = {
    /**
     * Desired tile width / height ratio (i.e. desiredRatio: 2 == twice as wide as tall).
     * The container will strive to meet this ratio, but the final ratio may vary.
     * Defaults to 1 (i.e. square tiles)
     */
    desiredRatio: PT.number,

    /** The space between tiles (in px) */
    spacing: PT.number,

    /** Min tile ratio. Defaults to 0.25 */
    minTileRatio: PT.number,

    /** Max tile ratio. Defaults to 4.0 */
    maxTileRatio: PT.number,

    /** Min tile width (in px). */
    minTileWidth: PT.number,

    /** Max tile width (in px). */
    maxTileWidth: PT.number,

    /** Min tile height (in px).*/
    minTileHeight: PT.number,

    /** Max tile height (in px).*/
    maxTileHeight: PT.number
};


class LocalModel extends HoistModel {

    params;
    layout;

    setParams(params) {
        if (isEqual(params, this.params)) return;
        this.params = params;
        this.layout = this.createLayout();
    }

    getTileStyle(idx) {
        const {spacing} = this.params,
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

    //-------------------
    // Implementation
    //-------------------
    createLayout() {
        const {width, height, count} = this.params;

        if (!width || !height || !count) return null;

        // Generate all possible tile layouts, from single column > single row.
        const scoredLayouts = [];
        for (let cols = 1; cols <= count; cols++) {
            scoredLayouts.push(this.generateScoredLayout(cols));
        }

        return minBy(scoredLayouts, 'score')?.layout ?? this.generateFallbackLayout();
    }

    generateScoredLayout(cols) {
        const {
            count,
            desiredRatio,
            minTileRatio,
            maxTileRatio,
            minTileWidth,
            maxTileWidth,
            minTileHeight,
            maxTileHeight
        } = this.params;
        const layout = this.generateLayout(cols),
            ratio = layout.tileWidth / layout.tileHeight;

        if (minTileWidth && layout.tileWidth < minTileWidth) return null;
        if (maxTileWidth && layout.tileWidth > maxTileWidth) return null;
        if (minTileHeight && layout.tileHeight < minTileHeight) return null;
        if (maxTileHeight && layout.tileHeight > maxTileHeight) return null;
        if (minTileRatio && ratio < minTileRatio) return null;
        if (maxTileRatio && ratio > maxTileRatio) return null;

        // We want to compromise between having as little empty space as possible,
        // and keeping the tile ratio as close to the desired ratio as possible.
        // This heuristic generates a score for each layout, where a lower score is better.
        const emptyCount = (layout.rows * cols) - count,
            ratioScore = Math.abs(desiredRatio - ratio),
            score = emptyCount > 0 ? ratioScore + Math.pow(emptyCount, 2) : ratioScore;

        return {layout, score};
    }

    // Fallback to single column or row meeting tile sizing constraints
    generateFallbackLayout() {
        const {
            width,
            height,
            count,
            minTileWidth,
            maxTileWidth,
            minTileHeight,
            maxTileHeight
        } = this.params;

        // Prefer single column if container has portrait orientation or a minTileWidth constraint.
        const singleCol = height > width || minTileWidth,
            cols = singleCol ? 1 : count,
            ret = this.generateLayout(cols);

        if (minTileWidth && ret.tileWidth < minTileWidth) ret.tileWidth = minTileWidth;
        if (maxTileWidth && ret.tileWidth > maxTileWidth) ret.tileWidth = maxTileWidth;
        if (minTileHeight && ret.tileHeight < minTileHeight) ret.tileHeight = minTileHeight;
        if (maxTileHeight && ret.tileHeight > maxTileHeight) ret.tileHeight = maxTileHeight;

        return ret;
    }

    generateLayout(cols) {
        const {width, height, count, spacing} = this.params,
            rows = Math.ceil(count / cols);
        return {
            cols,
            rows,
            tileWidth: Math.floor((width - spacing) / cols) - spacing,
            tileHeight: Math.floor((height - spacing) / rows) - spacing
        };
    }
}