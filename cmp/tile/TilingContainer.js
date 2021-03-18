/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useLocalModel, HoistModel} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {frame, box} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/js';
import {useOnResize, elementFromContent} from '@xh/hoist/utils/react';
import {minBy, isArray} from 'lodash';
import composeRefs from '@seznam/compose-react-refs';
import PT from 'prop-types';

import './TilingContainer.scss';

/**
 * This component binds to an observable array, and provides a tiling layout to display them.
 * Each entry is passed to the `content` component in each tile - it is up to the content to
 * determine how to render this `value`.
 *
 * It will generate a tiling layout that attempts to compromise between limiting empty space,
 * and keeping the tile width / height ratio as close to the desired ratio as possible.
 *
 * Supports a number of optional constraints on tile dimensions that can be used to produce more
 * stable layouts. These should be used judiciously, however, as each constraint limits the ability
 * of the TilingContainer to fill its available space.
 */
export const [TilingContainer, tilingContainer] = hoistCmp.withFactory({
    displayName: 'TilingContainer',
    className: 'xh-tiling-container',

    render({
        model,
        className,
        bind,
        content,
        desiredRatio = 1,
        spacing = 0,
        minTileRatio,
        maxTileRatio,
        minTileWidth,
        maxTileWidth,
        minTileHeight,
        maxTileHeight
    }, ref) {
        throwIf(!content, 'TilingContainer requires content');

        const localModel = useLocalModel(() => new LocalModel({
            model,
            bind,
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
            items: localModel.data.map((value, idx) => tile({
                localModel,
                content,
                value,
                idx
            }))
        });
    }
});

TilingContainer.propTypes = {
    /**
     * Model property name from which this component should read its observable
     * collection of data objects.
     */
    bind: PT.string,

    /**
     * Hoist Component (class or functional) to be rendered by this for each tile;
     * or function returning react element to be rendered for each tile.
     * Will receive bound `value` as a prop.
     */
    content: PT.oneOfType([PT.element, PT.object, PT.func]).isRequired,

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

const tile = hoistCmp.factory(
    ({localModel, content, value, idx}) => {
        if (!localModel.layout) return null;
        const style = localModel.getTileStyle(idx);
        return box({
            style,
            className: 'xh-tiling-container__tile',
            item: elementFromContent(content, {value})
        });
    }
);

class LocalModel extends HoistModel {

    @bindable.ref
    dimensions;

    model;
    bind;
    desiredRatio;
    spacing;
    minTileRatio;
    maxTileRatio;
    minTileWidth;
    maxTileWidth;
    minTileHeight;
    maxTileHeight;

    get data() {
        const {model, bind} = this,
            ret = model[bind] ?? [];

        throwIf(!isArray(ret), 'TilingContainer bound property is not an array');
        return ret;
    }

    @computed.struct
    get layout() {
        return this.selectLayout();
    }

    constructor({
        model,
        bind,
        desiredRatio,
        spacing,
        minTileRatio,
        maxTileRatio,
        minTileWidth,
        maxTileWidth,
        minTileHeight,
        maxTileHeight
    }) {
        super();
        makeObservable(this);

        this.model = model;
        this.bind = bind;
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
        const count = this.data?.length,
            layouts = [];

        if (!this.dimensions || !count) return null;

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
                minTileRatio,
                maxTileRatio,
                minTileWidth,
                maxTileWidth,
                minTileHeight,
                maxTileHeight
            } = this,
            {width, height} = this.dimensions,
            count = this.data.length,
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