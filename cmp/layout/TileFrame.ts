/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useLocalModel, HoistModel, BoxProps, HoistProps} from '@xh/hoist/core';
import {frame, box} from '@xh/hoist/cmp/layout';
import {useOnResize} from '@xh/hoist/utils/react';
import {useState, useLayoutEffect} from 'react';
import {minBy, isEqual} from 'lodash';
import composeRefs from '@seznam/compose-react-refs';
import {Children} from 'react';

import './TileFrame.scss';

export interface TileFrameProps extends HoistProps, BoxProps {
    /**
     * Desired tile width / height ratio (i.e. desiredRatio: 2 == twice as wide as tall).
     * The container will strive to meet this ratio, but the final ratio may vary.
     * Defaults to 1 (i.e. square tiles)
     */
    desiredRatio?: number;

    /** The space between tiles (in px) */
    spacing?: number;

    /** Min tile width (in px). */
    minTileWidth?: number;

    /** Max tile width (in px). */
    maxTileWidth?: number;

    /** Min tile height (in px).*/
    minTileHeight?: number;

    /** Max tile height (in px).*/
    maxTileHeight?: number;

    /** Callback triggered when the layout configuration changes.*/
    onLayoutChange?: (layout: {
        rows: number;
        cols: number;
        tileWidth: number;
        tileHeight: number;
    }) => any;
}

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
    memo: false,
    observer: false,
    className: 'xh-tile-frame',

    render(
        {
            children,
            desiredRatio = 1,
            spacing = 0,
            minTileWidth,
            maxTileWidth,
            minTileHeight,
            maxTileHeight,
            onLayoutChange,
            ...props
        }: TileFrameProps,
        ref
    ) {
        const localModel = useLocalModel(TileFrameLocalModel),
            [width, setWidth] = useState<number>(),
            [height, setHeight] = useState<number>(),
            childrenArr = Children.toArray(children);

        localModel.setParams({
            count: childrenArr.length,
            width,
            height,
            desiredRatio,
            spacing,
            minTileWidth,
            maxTileWidth,
            minTileHeight,
            maxTileHeight
        });

        useLayoutEffect(
            () => onLayoutChange?.(localModel.layout),
            [onLayoutChange, localModel.layout]
        );

        ref = composeRefs(
            ref,
            useOnResize(
                ({width, height}) => {
                    setWidth(width);
                    setHeight(height);
                },
                {debounce: 100}
            )
        );

        const items = localModel.layout
            ? childrenArr.map((item, idx) =>
                  box({
                      style: localModel.getTileStyle(idx),
                      className: 'xh-tile-frame__tile',
                      item,
                      key: item['key'] // trampoline any child key to prevent remounts
                  })
              )
            : null;

        return frame({ref, ...props, items});
    }
});

class TileFrameLocalModel extends HoistModel {
    override xhImpl = true;

    params;
    layout;

    setParams(params) {
        if (isEqual(params, this.params)) return;
        this.params = params;

        const layout = this.createLayout();
        if (isEqual(layout, this.layout)) return;
        this.layout = layout;
    }

    getTileStyle(idx) {
        const {spacing} = this.params,
            {cols, tileWidth, tileHeight} = this.layout,
            rowIdx = Math.floor(idx / cols),
            colIdx = idx - rowIdx * cols,
            top = tileHeight * rowIdx + rowIdx * spacing + spacing,
            left = tileWidth * colIdx + colIdx * spacing + spacing;

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

        return minBy(scoredLayouts, 'score')?.layout;
    }

    generateScoredLayout(cols) {
        const {width, minTileWidth, maxTileWidth, minTileHeight, maxTileHeight} = this.params;

        // 1) Generate layout
        const layout = this.generateLayout(cols);
        if (!layout) return null;

        // 2) Enforce size constraints
        if (minTileWidth && layout.tileWidth < minTileWidth) layout.tileWidth = minTileWidth;
        if (maxTileWidth && layout.tileWidth > maxTileWidth) layout.tileWidth = maxTileWidth;
        if (minTileHeight && layout.tileHeight < minTileHeight) layout.tileHeight = minTileHeight;
        if (maxTileHeight && layout.tileHeight > maxTileHeight) layout.tileHeight = maxTileHeight;

        // 3) Invalidate multi-column layouts that are wider than the container.
        // The single column layout is always valid as a fallback for when your minTileWidth exceeds the container width
        if (minTileWidth && layout.cols > 1 && this.getRequiredWidth(layout) > width) return null;

        const score = this.scoreLayout(layout);
        return {layout, score};
    }

    generateLayout(cols) {
        const {width, height, count, spacing} = this.params,
            rows = Math.ceil(count / cols),
            tileWidth = Math.floor((width - spacing) / cols) - spacing,
            tileHeight = Math.floor((height - spacing) / rows) - spacing;

        if (tileWidth <= 0 || tileHeight <= 0) return null;
        return {cols, rows, tileWidth, tileHeight};
    }

    // This heuristic generates a score for each layout, where a lower score is better.
    scoreLayout(layout) {
        const ratioScore = this.getRatioScore(layout),
            emptyScore = this.getEmptyScore(layout),
            widthFillingScore = this.getWidthFillingScore(layout);

        return ratioScore + emptyScore + widthFillingScore;
    }

    // A higher score indicates further deviance from the desired ratio.
    getRatioScore(layout) {
        const {desiredRatio} = this.params,
            ratio = layout.tileWidth / layout.tileHeight,
            invertedDesiredRatio = 1 / desiredRatio,
            invertedRatio = 1 / ratio;

        return Math.abs(desiredRatio - ratio) + Math.abs(invertedDesiredRatio - invertedRatio);
    }

    // A higher score indicates more empty tile space
    getEmptyScore(layout) {
        const {count} = this.params,
            emptyCount = layout.rows * layout.cols - count;

        return Math.pow(emptyCount, 2);
    }

    // Returns a value normalised between 0-1 representing how much of the available width
    // is empty. A higher score indicates more empty space.
    getWidthFillingScore(layout) {
        const {minTileWidth, maxTileWidth, width} = this.params;
        if (!minTileWidth && !maxTileWidth) return 0;

        const requiredWidth = this.getRequiredWidth(layout),
            excessWidth = Math.max(0, width - requiredWidth);

        return (excessWidth / width) * 10;
    }

    getRequiredWidth(layout) {
        return layout.tileWidth * layout.cols + (layout.cols + 1) * this.params.spacing;
    }
}
