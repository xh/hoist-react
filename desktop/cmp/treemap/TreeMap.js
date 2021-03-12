/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, useLocalModel, uses, XH} from '@xh/hoist/core';
import {box, div, placeholder} from '@xh/hoist/cmp/layout';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {wait} from '@xh/hoist/promise';
import {withShortDebug} from '@xh/hoist/utils/js';
import {createObservableRef, getLayoutProps, useOnResize, useOnVisibleChange} from '@xh/hoist/utils/react';
import {assign, cloneDeep, debounce, isFunction, merge, omit} from 'lodash';
import composeRefs from '@seznam/compose-react-refs';
import equal from 'fast-deep-equal';
import classNames from 'classnames';
import PT from 'prop-types';

import './TreeMap.scss';
import {TreeMapModel} from './TreeMapModel';
import {DarkTheme} from './theme/Dark';
import {LightTheme} from './theme/Light';

/**
 * Component for rendering a TreeMap.
 *
 * It is a managed wrapper around a Highcharts TreeMap visualization, which renders
 * records from a Store and optionally binds to a GridModel.
 *
 * @see TreeMapModel
 */
export const [TreeMap, treeMap] = hoistCmp.withFactory({
    displayName: 'TreeMapModel',
    model: uses(TreeMapModel),
    className: 'xh-treemap',

    render({model, className, ...props}, ref) {
        if (!Highcharts) {
            console.error(
                'Highcharts has not been imported in to this application. Please import and ' +
                'register in Bootstrap.js.  See Toolbox for an example.'
            );
            return 'Highcharts not available';
        }

        const impl = useLocalModel(() => new LocalModel(model));
        ref = composeRefs(
            ref,
            useOnResize(impl.startResize),
            useOnResize(impl.onResizeAsync, {debounce: 100}),
            useOnVisibleChange(impl.onVisibleChange)
        );

        // Default flex = 1 (flex: 1 1 0) if no dimensions / flex specified, i.e. do not consult child for dimensions;
        const layoutProps = getLayoutProps(props);
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 1;
        }

        // Render child item - note this will NOT render the actual HighCharts viz - only a shell
        // div to hold one. The chart itself will be rendered once the shell's ref resolves.
        const {error, emptyText, hasData, isResizing} = model;
        let item;
        if (error) {
            item = errorMessage({error});
        } else if (!hasData) {
            item = placeholder(emptyText);
        } else {
            item = div({
                className: classNames(
                    'xh-treemap__chart-holder',
                    isResizing ? 'xh-treemap__chart-holder--resizing' : null
                ),
                ref: impl.chartRef
            });
        }

        return box({
            ...layoutProps,
            className,
            ref,
            item
        });
    }
});

TreeMap.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(TreeMapModel), PT.object])
};

class LocalModel extends HoistModel {

    /** @member {TreeMapModel} */
    model;
    chartRef = createObservableRef();

    chart = null;
    clickCount = 0;

    constructor(model) {
        super();
        this.model = model;

        // Detect double-clicks vs single-clicks
        this.clickCount = 0;
        this.debouncedClickHandler = debounce(this.clickHandler, 500);

        // Render HighChart when chartElem container ready in DOM, or dependencies updated
        const chartDependencies = () => ([
            this.chartRef.current,
            model.highChartsConfig,
            model.algorithm,
            model.data,
            XH.darkTheme
        ]);

        this.addReaction({
            track: chartDependencies,
            run: () => this.createOrReloadHighChart()
        });

        this.addReaction({
            track: () => [model.selectedIds, chartDependencies()],
            run: () => this.syncSelection(),
            debounce: 1  // prevents chattiness on reload and provides needed delay for chart to render
        });
    }

    createOrReloadHighChart() {
        const chartElem = this.chartRef.current;
        if (!chartElem) {
            // Ensure any chart instance is cleaned up if the ref drops.
            // This will ensure it is recreated on next render cycle when the ref and DOM are back.
            this.destroyHighChart();
            return;
        }

        // Extract and compare a subset of the config across calls to determine if we should
        // recreate the entire chart or just reload the series data.
        const config = this.getMergedConfig(),
            chartCfg = omit(config, 'series', 'tooltip'),
            canUpdateInPlace = this.chart && equal(chartCfg, this.prevConfig);

        if (canUpdateInPlace) {
            this.reloadSeriesData(config.series[0].data);
        } else {
            this.prevConfig = cloneDeep(chartCfg);
            this.createChart(config);
        }

        this.updateLabelVisibility();
    }

    createChart(config) {
        const chartElem = this.chartRef.current;
        if (!chartElem) return;

        const newData = config.series[0].data,
            parentEl = chartElem.parentElement,
            parentDims = {
                width: parentEl.offsetWidth,
                height: parentEl.offsetHeight
            };

        this.destroyHighChart();

        // Skip creating HighCharts instance if hidden - we will
        // instead create when it becomes visible
        if (parentDims.width === 0 || parentDims.height === 0) return;

        assign(config.chart, parentDims, {renderTo: chartElem});
        withShortDebug(`Creating new TreeMap | ${newData.length} records`, () => {
            this.chart = Highcharts.chart(config);
        }, this);
    }

    reloadSeriesData(newData) {
        if (!this.chart) return;
        withShortDebug(`Updating TreeMap series | ${newData.length} records`, () => {
            this.chart.series[0].setData(newData, true, false);
        }, this);
    }

    startResize = ({width, height}) => {
        const {chart, model} = this;
        if (!chart || model.isResizing) return;

        // Resizing can take time if there are a lot of nodes, leaving undesirable whitespace.
        // Apply a mask if the amount of whitespace is 'significant' enough to warrant masking.
        // Use a heuristic to determine if the amount of whitespace is 'significant'. Whitespace
        // is deemed to be significant if it extends beyond 50px in either direction.
        width = Math.round(width);
        height = Math.round(height);

        const currentWidth = chart.clipBox.width,
            currentHeight = chart.clipBox.height,
            widthChange = width - currentWidth,
            heightChange = height - currentHeight,
            threshold = 50;

        if (widthChange > threshold || heightChange > threshold) {
            model.setIsResizing(true);
        }
    }

    onResizeAsync = async ({width, height}) => {
        const {chart, model} = this;
        if (!chart) return;

        width = Math.round(width);
        height = Math.round(height);

        if (width > 0 && height > 0) {
            this.chart.setSize(width, height, false);
        }
        await wait(0);

        model.setIsResizing(false);
        this.updateLabelVisibility();
    };

    onVisibleChange = (visible) => {
        if (visible && !this.chart) {
            this.createOrReloadHighChart();
        }
    };

    destroy() {
        this.destroyHighChart();
        super.destroy();
    }

    destroyHighChart() {
        this.chart?.destroy();
        this.chart = null;
    }

    //----------------------
    // Highcharts Config
    //----------------------
    getMergedConfig() {
        const defaultConf = this.getDefaultConfig(),
            themeConf = this.getThemeConfig(),
            modelConf = this.getModelConfig();

        return merge(defaultConf, themeConf, modelConf);
    }

    getDefaultConfig() {
        return {
            chart: {margin: false},
            credits: false,
            title: false,
            legend: {enabled: false},
            exporting: {enabled: false}
        };
    }

    getThemeConfig() {
        return XH.darkTheme ? cloneDeep(DarkTheme) : cloneDeep(LightTheme);
    }

    getModelConfig() {
        const {data, algorithm, tooltip, maxNodes, highchartsConfig} = this.model,
            {defaultTooltip} = this;

        return merge({
            tooltip: {
                enabled: !!tooltip,
                useHTML: true,
                padding: 0,
                shape: 'square',
                shadow: false,
                outside: true,
                pointFormatter: function() {
                    if (!tooltip) return;
                    const {record} = this;
                    return isFunction(tooltip) ? tooltip(record) : defaultTooltip(record);
                }
            },
            series: [{
                data,
                type: 'treemap',
                animation: false,
                layoutAlgorithm: algorithm,
                borderWidth: 0,
                turboThreshold: maxNodes,
                dataLabels: {
                    enabled: true,
                    allowOverlap: false,
                    align: 'left',
                    verticalAlign: 'top',
                    style: {textOutline: 'none', visibility: 'hidden'}
                },
                events: {click: this.onClick}
            }]
        }, highchartsConfig);
    }

    //----------------------
    // Click handling
    //----------------------
    onClick = (e) => {
        this.clickCount++;
        this.debouncedClickHandler(e.point.record, e);
        if (this.clickCount >= 2) this.debouncedClickHandler.flush();
    }

    clickHandler(record, e) {
        try {
            const {onClick, onDoubleClick} = this.model;
            if (onClick && this.clickCount === 1) {
                onClick(record, e);
            } else if (onDoubleClick) {
                onDoubleClick(record, e);
            }
        } finally {
            this.clickCount = 0;
        }
    }

    //----------------------
    // Selection handling
    //----------------------
    syncSelection() {
        if (!this.chart) return;

        const {selectedIds, maxDepth, gridModel, store} = this.model;

        // Fallback to parent node if selection exceeds max depth
        let toSelect;
        if (maxDepth && gridModel?.treeMode) {
            toSelect = new Set(selectedIds.map(id => {
                const record = store.getById(id);
                return record ? record.treePath.slice(0, maxDepth).pop() : null;
            }));
        } else {
            toSelect = new Set(selectedIds);
        }

        // Update selection in chart
        this.chart.series[0].data.forEach(node => {
            node.select(toSelect.has(node.id), true);
        });
    }

    //----------------------
    // Labels
    //----------------------
    updateLabelVisibility() {
        if (!this.chart) return;

        // Show / hide labels by comparing label size to node size
        let hasChanges = false;
        this.chart.series[0].data.forEach(node => {
            const {dataLabel, graphic} = node;
            if (dataLabel && graphic) {
                const buffer = 10,
                    tooSmallWidth = (dataLabel.width + buffer) > graphic.element.width.baseVal.value,
                    tooSmallHeight = (dataLabel.height + buffer) > graphic.element.height.baseVal.value,
                    currentVisibility = dataLabel.styles.visibility,
                    newVisibility = tooSmallWidth || tooSmallHeight ? 'hidden' : 'visible';

                if (currentVisibility !== newVisibility) {
                    const updates = {dataLabels: {style: {visibility: newVisibility}}};
                    node.update(updates, false, false);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            this.chart.redraw();
        }
    }

    //----------------------
    // Tooltip
    //----------------------
    defaultTooltip = (record) => {
        const {model} = this,
            {labelField, valueField, heatField, valueFieldLabel, heatFieldLabel, valueRenderer, heatRenderer} = model,
            name = record.get(labelField),
            value = record.get(valueField),
            heat = record.get(heatField),
            labelDiv = `<div class='xh-treemap-tooltip__label'>${name}</div>`;

        let valueDiv = '';
        if (model.valueIsValid(value)) {
            valueDiv = (`
                <div class='xh-treemap-tooltip__row'>
                    <div>${valueFieldLabel}:</div>
                    <div>${valueRenderer(value)}</div>
                </div>
            `);
        }

        let heatDiv = '';
        if (valueField !== heatField && model.valueIsValid(heat)) {
            heatDiv = (`
                <div class='xh-treemap-tooltip__row'>
                    <div>${heatFieldLabel}:</div>
                    <div>${heatRenderer(heat)}</div>
                </div>
            `);
        }

        return `<div class='xh-treemap-tooltip'>${labelDiv}${valueDiv}${heatDiv}</div>`;
    };
}
