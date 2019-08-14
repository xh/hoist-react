/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import PT from 'prop-types';
import {Highcharts} from '@xh/hoist/kit/highcharts';

import {XH, elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div, box, frame} from '@xh/hoist/cmp/layout';
import {Ref} from '@xh/hoist/utils/react';
import {resizeSensor} from '@xh/hoist/kit/blueprint';
import {fmtNumber} from '@xh/hoist/format';
import {start} from '@xh/hoist/promise';
import {assign, merge, clone, debounce, isFunction, isEqual, omit} from 'lodash';

import {LightTheme} from './theme/Light';
import {DarkTheme} from './theme/Dark';

import './TreeMap.scss';
import {TreeMapModel} from './TreeMapModel';

/**
 * Component for rendering a TreeMap.
 *
 * It is a managed wrapper around a Highcharts TreeMap visualization, which renders
 * records from a Store and optionally binds to a GridModel.
 *
 * @see TreeMapModel
 */
@HoistComponent
@LayoutSupport
export class TreeMap extends Component {

    static propTypes = {
        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(TreeMapModel), PT.object]).isRequired
    };

    static modelClass = TreeMapModel;

    baseClassName = 'xh-treemap';

    _chartElem = new Ref();
    _chart = null;

    constructor(props) {
        super(props);

        // Detect double-clicks vs single-clicks
        this._clickCount = 0;
        this._debouncedClickHandler = debounce(this.clickHandler, 500);

        // Re-render highchart on config change
        this.addReaction({
            track: () => [this._chartElem.value, this.getMergedConfig()],
            run: () => this.renderHighChart()
        });

        // Sync selection
        this.addReaction({
            track: () => [this.model.selectedIds, this.model.data],
            run: () => this.syncSelection(),
            delay: 1 // Must wait for chart re-render on data / config change
        });
    }

    render() {
        // Default flex = 1 (flex: 1 1 0) if no dimensions / flex specified, i.e. do not consult child for dimensions;
        const layoutProps = this.getLayoutProps();
        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 1;
        }

        // Render child item
        const {data, error} = this.model;
        let item;
        if (error) {
            item = this.renderError(error);
        } else if (!data.length) {
            item = this.renderPlaceholder();
        } else {
            item = this.renderChartHolder();
        }

        // Inner div required to be the ref for the chart element
        return resizeSensor({
            onResize: debounce((e) => this.resizeChartAsync(e), 100),
            item: box({
                ...layoutProps,
                className: this.getClassName(),
                item
            })
        });
    }

    renderError(error) {
        return frame({
            className: 'xh-treemap__error-message',
            item: <p>{error}</p>
        });
    }

    renderPlaceholder() {
        return frame({
            className: 'xh-treemap__placeholder',
            item: <p>{this.model.emptyText}</p>
        });
    }

    renderChartHolder() {
        return div({
            className: 'xh-treemap__chart-holder',
            ref: this._chartElem.ref
        });
    }

    //-------------------
    // Implementation
    //-------------------
    renderHighChart() {
        const chartElem = this._chartElem.value;
        if (!chartElem) return;

        // Todo: Comment
        const config = this.getMergedConfig(),
            chartCfg = omit(config, 'series', 'tooltip'),
            prevChartCfg = omit(this._prevConfig, 'series', 'tooltip'),
            onlyDataChanged = isEqual(chartCfg, prevChartCfg);

        if (this._chart && onlyDataChanged) {
            // Update data if only the data has changed
            this._chart.series[0].setData(config.series[0].data, false, true);
        } else {
            // Rebuild chart if chart config has changed
            this.destroyHighChart();

            const parentEl = chartElem.parentElement;
            assign(config.chart, {
                width: parentEl.offsetWidth,
                height: parentEl.offsetHeight
            });
            config.chart.renderTo = chartElem;

            this._chart = Highcharts.chart(config);
        }
        this._prevConfig = config;

        this.updateLabelVisibility();
    }

    async resizeChartAsync(e) {
        if (!this._chart) return;
        await start(() => {
            const {width, height} = e[0].contentRect;
            if (width > 0 && height > 0) {
                this._chart.setSize(width, height, false);
            }
        });
        this.updateLabelVisibility();
    }

    destroy() {
        this.destroyHighChart();
    }

    destroyHighChart() {
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    }

    //----------------------
    // Highcharts Config
    //----------------------
    getMergedConfig() {
        const defaultConf = this.getDefaultConfig(),
            themeConf = this.getThemeConfig(),
            propsConf = this.getModelConfig();

        return merge(defaultConf, themeConf, propsConf);
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
        return XH.darkTheme ? clone(DarkTheme) : clone(LightTheme);
    }

    getModelConfig() {
        const {data, highchartsConfig, algorithm, tooltip, maxNodes} = this.model,
            {defaultTooltip} = this;

        return {
            ...highchartsConfig,
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
        };
    }

    //----------------------
    // Click handling
    //----------------------
    onClick = (e) => {
        this._clickCount++;
        this._debouncedClickHandler(e.point.record, e);
        if (this._clickCount >= 2) this._debouncedClickHandler.flush();
    };

    clickHandler(record, e) {
        try {
            const {onClick, onDoubleClick} = this.model;
            if (onClick && this._clickCount === 1) {
                onClick(record, e);
            } else if (onDoubleClick) {
                onDoubleClick(record, e);
            }
        } finally {
            this._clickCount = 0;
        }
    }

    //----------------------
    // Selection handling
    //----------------------
    syncSelection() {
        if (!this._chart) return;

        const {selectedIds, maxDepth, gridModel, store} = this.model;

        // Fallback to parent node if selection exceeds max depth
        let toSelect;
        if (maxDepth && gridModel && gridModel.treeMode) {
            toSelect = new Set(selectedIds.map(id => {
                const record = store.getById(id);
                return record ? record.xhTreePath.slice(0, maxDepth).pop() : null;
            }));
        } else {
            toSelect = new Set(selectedIds);
        }

        // Update selection in chart
        this._chart.series[0].data.forEach(node => {
            node.select(toSelect.has(node.id), true);
        });
    }

    //----------------------
    // Labels
    //----------------------
    updateLabelVisibility() {
        if (!this._chart) return;

        // Show / hide labels by comparing label size to node size
        let hasChanges = false;
        this._chart.series[0].data.forEach(node => {
            if (node.dataLabel && node.graphic) {
                const buffer = 10,
                    tooSmallWidth = (node.dataLabel.width + buffer) > node.graphic.element.width.baseVal.value,
                    tooSmallHeight = (node.dataLabel.height + buffer) > node.graphic.element.height.baseVal.value,
                    currentVisibility = node.dataLabel.styles.visibility,
                    newVisibility = tooSmallWidth || tooSmallHeight ? 'hidden' : 'visible';

                if (currentVisibility !== newVisibility) {
                    const updates = {dataLabels: {style: {visibility: newVisibility}}};
                    node.update(updates, false, false);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) this._chart.redraw();
    }

    //----------------------
    // Tooltip
    //----------------------
    defaultTooltip = (record) => {
        const {labelField, valueField, heatField, valueFieldLabel, heatFieldLabel} = this.model,
            name = record[labelField],
            value = record[valueField],
            heat = record[heatField],
            labelDiv = `<div class='xh-treemap-tooltip__label'>${name}</div>`,
            valueDiv = (`
                <div class='xh-treemap-tooltip__row'>
                    <div>${valueFieldLabel}:</div>
                    <div>${fmtNumber(value)}</div>
                </div>
            `),
            heatDiv = valueField === heatField ? '' : (`
                <div class='xh-treemap-tooltip__row'>
                    <div>${heatFieldLabel}:</div>
                    <div>${fmtNumber(heat)}</div>
                </div>
            `);

        return `<div class='xh-treemap-tooltip'>${labelDiv}${valueDiv}${heatDiv}</div>`;
    };
}

export const treeMap = elemFactory(TreeMap);