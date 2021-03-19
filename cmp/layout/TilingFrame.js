/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useLocalModel, HoistModel} from '@xh/hoist/core';
import {bindable, observable, action, computed, makeObservable} from '@xh/hoist/mobx';
import {frame, box} from '@xh/hoist/cmp/layout';
import {getLayoutProps, useOnResize} from '@xh/hoist/utils/react';
import {useEffect} from 'react';
import {minBy, castArray} from 'lodash';
import composeRefs from '@seznam/compose-react-refs';
import PT from 'prop-types';

import './TilingFrame.scss';

/**
 * This component renders its children as space filling tiles of the equal size.
 * It will generate a tiling layout that attempts to compromise between limiting empty space,
 * and keeping the tile width / height ratio as close to the desired ratio as possible.
 *
 * Supports a number of optional constraints on tile dimensions that can be used to produce more
 * stable layouts. These should be used judiciously, however, as each constraint limits the ability
 * of the TilingFrame to fill its available space.
 */
export const [TilingFrame, tilingFrame] = hoistCmp.withFactory({
    displayName: 'TilingFrame',
    className: 'xh-tiling-frame',

    render({
        children,
        className,
        desiredRatio = 1,
        spacing = 0,
        minTileRatio,
        maxTileRatio,
        minTileWidth,
        maxTileWidth,
        minTileHeight,
        maxTileHeight,
        ...props
    }, ref) {
        const localModel = useLocalModel(() => new LocalModel()),
            layoutProps = getLayoutProps(props),
            items = castArray(children),
            count = children.length;

        useEffect(() => localModel.setConfigProps({
            count,
            desiredRatio,
            spacing,
            minTileRatio,
            maxTileRatio,
            minTileWidth,
            maxTileWidth,
            minTileHeight,
            maxTileHeight
        }));

        ref = composeRefs(
            ref,
            useOnResize(dimensions => localModel.setDimensions(dimensions), {debounce: 100})
        );

        return frame({
            ref,
            className,
            ...layoutProps,
            items: !localModel.layout ? null : items.map((item, idx) => {
                const style = localModel.getTileStyle(idx),
                    className = 'xh-tiling-frame__tile';

                return box({style, className, item});
            })
        });
    }
});

TilingFrame.propTypes = {
    /**
     * Desired tile width / height ratio (i.e. desiredRatio: 2 == twice as wide as tall).
     * Layouts will strive to meet this ratio, but the final ratio may vary. Defaults to 1 (i.e. square tiles)
     */
    desiredRatio: PT.number,

    /** The space between tiles (in px) */
    spacing: PT.number,

    /** Min tile ratio. Only layouts that meet this condition will be considered */
    minTileRatio: PT.number,

    /** Max tile ratio. Only layouts that meet this condition will be considered */
    maxTileRatio: PT.number,

    /** Min tile width (in px). Only layouts that meet this condition will be considered */
    minTileWidth: PT.number,

    /** Max tile width (in px). Only layouts that meet this condition will be considered */
    maxTileWidth: PT.number,

    /**
     * Min tile height (in px). Unlike minTileWidth, failing to meet this condition does not
     * automatically invalidate the layout. Instead, the container will scroll if necessary
     */
    minTileHeight: PT.number,

    /**
     * Max tile height (in px). Unlike maxTileWidth, failing to meet this condition does not
     * automatically invalidate the layout. Instead, the container will scroll if necessary
     */
    maxTileHeight: PT.number
};

class LocalModel extends HoistModel {

    @bindable.ref dimensions;
    @observable count;
    @observable desiredRatio;
    @observable spacing;
    @observable minTileRatio;
    @observable maxTileRatio;
    @observable minTileWidth;
    @observable maxTileWidth;
    @observable minTileHeight;
    @observable maxTileHeight;

    @computed.struct
    get layout() {
        return this.selectLayout();
    }

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    setConfigProps({
        count,
        desiredRatio,
        spacing,
        minTileRatio,
        maxTileRatio,
        minTileWidth,
        maxTileWidth,
        minTileHeight,
        maxTileHeight
    }) {
        this.count = count;
        this.desiredRatio = desiredRatio;
        this.spacing = spacing;
        this.minTileRatio = minTileRatio;
        this.maxTileRatio = maxTileRatio;
        this.minTileWidth = minTileWidth;
        this.maxTileWidth = maxTileWidth;
        this.minTileHeight = minTileHeight;
        this.maxTileHeight = maxTileHeight;
    }

    //-------------------
    // Implementation
    //-------------------
    selectLayout() {
        const {dimensions, count} = this,
            layouts = [];

        if (!dimensions || !count) return null;

        // Generate all possible tile layouts, from single column > single row.
        for (let i = 1; i <= count; i++) {
            const cols = i,
                rows = Math.ceil(count / cols);

            layouts.push(this.generateLayout(cols, rows, false));
        }

        // Choose layout with the best (i.e. lowest) score.
        // Fall back to single row or single column layout if unable to satisfy constraints.
        // Prefer single row if container has landscape orientation and single column if portrait.
        let layout = minBy(layouts, 'score');
        if (!layout) {
            const {width, height} = dimensions,
                colCount = height > width ? 1 : count,
                rowCount = height > width ? count : 1;
            layout = this.generateLayout(colCount, rowCount, true);
        }

        return layout;
    }

    generateLayout(cols, rows, skipConstraints = false) {
        const {
                dimensions,
                count,
                desiredRatio,
                spacing,
                minTileRatio,
                maxTileRatio,
                minTileWidth,
                maxTileWidth,
                minTileHeight,
                maxTileHeight
            } = this,
            {width, height} = dimensions,
            emptyCount = (rows * cols) - count;

        // Calculate tile width / height
        let tileWidth = Math.floor((width - spacing) / cols) - spacing,
            tileHeight = Math.floor((height - spacing) / rows) - spacing;

        if (!skipConstraints) {
            if (minTileWidth && tileWidth < minTileWidth) return null;
            if (maxTileWidth && tileWidth > maxTileWidth) return null;
        }

        if (minTileHeight && tileHeight < minTileHeight) tileHeight = minTileHeight;
        if (maxTileHeight && tileHeight > maxTileHeight) tileHeight = maxTileHeight;

        // Calculate tile width / height ratio
        const ratio = tileWidth / tileHeight;

        if (!skipConstraints) {
            if (minTileRatio && ratio < minTileRatio) return null;
            if (maxTileRatio && ratio > maxTileRatio) return null;
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