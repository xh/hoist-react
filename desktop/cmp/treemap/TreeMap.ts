/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {box, div, placeholder} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    lookup,
    TestSupportProps,
    useLocalModel,
    uses,
    XH
} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import '@xh/hoist/desktop/register';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {wait} from '@xh/hoist/promise';
import {logError, logWithDebug} from '@xh/hoist/utils/js';
import {
    createObservableRef,
    getLayoutProps,
    useOnResize,
    useOnVisibleChange
} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import equal from 'fast-deep-equal';
import {assign, cloneDeep, debounce, isFunction, merge, omit} from 'lodash';

import './TreeMap.scss';
import {TreeMapModel} from './TreeMapModel';

export interface TreeMapProps extends HoistProps<TreeMapModel>, LayoutProps, TestSupportProps {}

/**
 * Component for rendering a TreeMap.
 *
 * It is a managed wrapper around a Highcharts TreeMap visualization, which renders
 * records from a Store and optionally binds to a GridModel.
 *
 * @see TreeMapModel
 */
export const [TreeMap, treeMap] = hoistCmp.withFactory<TreeMapProps>({
    displayName: 'TreeMap',
    model: uses(TreeMapModel),
    className: 'xh-treemap',

    render({model, className, testId, ...props}, ref) {
        if (!Highcharts) {
            logError(
                'Highcharts has not been imported in to this application. Please import and ' +
                    'register in Bootstrap.js.  See Toolbox for an example.',
                TreeMap
            );
            return 'Highcharts not available';
        }

        const impl = useLocalModel(TreeMapLocalModel);
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
        const {error, empty, emptyText, isMasking} = model;
        let items;
        if (error) {
            items = errorMessage({error});
        } else if (empty) {
            items = placeholder(emptyText);
        } else {
            items = [
                div({
                    className: 'xh-treemap__chart-holder',
                    ref: impl.chartRef
                }),
                div({
                    omit: !isMasking,
                    className: 'xh-treemap__mask-holder',
                    item: mask({isDisplayed: true, spinner: true})
                })
            ];
        }

        return box({
            ...layoutProps,
            className: classNames(className, `xh-treemap--${impl.theme}`),
            ref,
            testId,
            items
        });
    }
});

class TreeMapLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(TreeMapModel) model: TreeMapModel;
    chartRef = createObservableRef<HTMLElement>();

    chart = null;
    clickCount = 0;
    debouncedClickHandler;

    private prevConfig;

    get theme() {
        if (this.model.theme && this.model.theme !== 'system') return this.model.theme;
        return XH.darkTheme ? 'dark' : 'light';
    }

    override onLinked() {
        const {model} = this;
        // Detect double-clicks vs single-clicks
        this.clickCount = 0;
        this.debouncedClickHandler = debounce(this.clickHandler, 500);

        // Render HighChart when chartElem container ready in DOM, or dependencies updated
        const chartDependencies = () => [
            this.chartRef.current,
            model.highchartsConfig,
            model.algorithm,
            model.data,
            this.theme
        ];

        this.addReaction({
            track: chartDependencies,
            run: () => this.createOrReloadHighChart()
        });

        this.addReaction({
            track: () => [model.selectedIds, chartDependencies()],
            run: () => this.syncSelection(),
            debounce: 1 // prevents chattiness on reload and provides needed delay for chart to render
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
        this.withDebug(['Creating new TreeMap', `${newData.length} records`], () => {
            this.chart = Highcharts.chart(config);
        });
    }

    @logWithDebug
    reloadSeriesData(newData) {
        this.chart?.series[0].setData(newData, true, false);
    }

    startResize = ({width, height}) => {
        const {chart, model} = this;
        if (!chart || model.isMasking) return;

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
            model.isMasking = true;
        }
    };

    onResizeAsync = async ({width, height}) => {
        const {chart, model} = this;
        if (!chart) return;

        width = Math.round(width);
        height = Math.round(height);

        if (width > 0 && height > 0) {
            chart.setSize(width, height, false);
        }
        await wait();

        model.isMasking = false;
        this.updateLabelVisibility();
    };

    onVisibleChange = visible => {
        if (visible && !this.chart) {
            this.createOrReloadHighChart();
        }
    };

    override destroy() {
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
            colorConf = this.getColorConfig(),
            modelConf = this.getModelConfig();

        return merge(defaultConf, colorConf, modelConf);
    }

    getDefaultConfig() {
        return {
            chart: {margin: false},
            credits: false,
            title: false,
            legend: {enabled: false},
            exporting: {enabled: false},
            tooltip: {hideDelay: 0} // prevent simult. display in adjacent maps (e.g. SplitTreeMap)
        };
    }

    getColorConfig() {
        const darkTheme = this.theme === 'dark';
        return {
            colorAxis: {
                min: 0,
                max: 1,
                stops: [
                    [0, darkTheme ? '#CC0000' : '#640000'], // Max negative
                    [0.4, darkTheme ? '#0E0909' : '#f7f2f2'], // Min negative
                    [0.5, darkTheme ? '#555555' : '#BBBBBB'], // None / incomputable
                    [0.6, darkTheme ? '#090E09' : '#f2f7f2'], // Min positive / zero
                    [1, darkTheme ? '#00CC00' : '#006400'] // Max positive
                ]
            }
        };
    }

    getModelConfig() {
        const {data, algorithm, tooltip, highchartsConfig} = this.model,
            {defaultTooltip} = this;

        return merge(
            {
                tooltip: {
                    enabled: !!tooltip,
                    useHTML: true,
                    padding: 0,
                    shape: 'square',
                    shadow: false,
                    outside: true,
                    pointFormatter: function () {
                        if (!tooltip) return;
                        const {record} = this;
                        return isFunction(tooltip) ? tooltip(record) : defaultTooltip(record);
                    }
                },
                plotOptions: {
                    treemap: {
                        layoutAlgorithm: algorithm,
                        animation: false,
                        borderWidth: 0,
                        events: {click: this.onClick},
                        dataLabels: {
                            enabled: true,
                            allowOverlap: false,
                            align: 'left',
                            verticalAlign: 'top',
                            // See stylesheet for additional label style overrides.
                            style: {
                                // Disable default outlining via HC pseudo-property.
                                textOutline: 'none',
                                // Default to hidden, updated selectively in updateLabelVisibility().
                                visibility: 'hidden'
                            }
                        }
                    }
                },
                series: [{data, type: 'treemap'}],
                accessibility: {enabled: false}
            },
            highchartsConfig
        );
    }

    //----------------------
    // Click handling
    //----------------------
    onClick = e => {
        this.clickCount++;
        this.debouncedClickHandler(e.point.record, e);
        if (this.clickCount >= 2) this.debouncedClickHandler.flush();
    };

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
            toSelect = new Set(
                selectedIds.map(id => {
                    const record = store.getById(id);
                    return record ? record.treePath.slice(0, maxDepth).pop() : null;
                })
            );
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
                const buffer = 5,
                    tooSmallWidth = dataLabel.width + buffer > graphic.element.width.baseVal.value,
                    tooSmallHeight =
                        dataLabel.height + buffer > graphic.element.height.baseVal.value,
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
    defaultTooltip = record => {
        const {model} = this,
            {
                labelField,
                valueField,
                heatField,
                valueFieldLabel,
                heatFieldLabel,
                valueRenderer,
                heatRenderer
            } = model,
            name = record.get(labelField),
            value = record.get(valueField),
            heat = record.get(heatField),
            labelDiv = `<div class='xh-treemap-tooltip__label'>${name}</div>`;

        let valueDiv = '';
        if (model.valueIsValid(value)) {
            valueDiv = `
                <div class='xh-treemap-tooltip__row'>
                    <div>${valueFieldLabel}:</div>
                    <div>${valueRenderer(value, record)}</div>
                </div>
            `;
        }

        let heatDiv = '';
        if (valueField !== heatField && model.valueIsValid(heat)) {
            heatDiv = `
                <div class='xh-treemap-tooltip__row'>
                    <div>${heatFieldLabel}:</div>
                    <div>${heatRenderer(heat, record)}</div>
                </div>
            `;
        }

        return `<div class='xh-treemap-tooltip'>${labelDiv}${valueDiv}${heatDiv}</div>`;
    };
}
