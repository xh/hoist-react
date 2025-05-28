/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {isValidElement, MouseEvent, ReactNode} from 'react';
import {isEmpty, isString} from 'lodash';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {MenuItem, MenuItemLike, XH} from '@xh/hoist/core';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {Icon} from '@xh/hoist/icon';

export type ChartContextMenuToken =
    | 'viewFullscreen'
    | 'copyToClipboard'
    | 'printChart'
    | 'downloadJPEG'
    | 'downloadPNG'
    | 'downloadSVG'
    | 'downloadCSV'
    | 'downloadXLS'
    | 'downloadPDF';

export interface ChartMenuItem extends Omit<MenuItem, 'actionFn'> {
    actionFn?: (e: MouseEvent | PointerEvent, chartModel?: ChartModel) => void;
}

export type ChartMenuItemLike = ChartMenuItem | ReactNode;

/**
 * If a String, value can be '-' for a separator, or a token supported by HighCharts
 * for its native menu items, or a Hoist specific token.
 */
export type ChartContextMenuItemLike = ChartMenuItemLike | ChartContextMenuToken | string;

/**
 * Specification for a ChartContextMenu.  Either a list of items, or a function to produce one.
 */
export type ChartContextMenuSpec =
    | boolean
    | ChartContextMenuItemLike[]
    | ((chartModel: ChartModel) => ChartContextMenuItemLike[]);

export function isChartMenuItem(item: ChartMenuItemLike): item is ChartMenuItem {
    return !isString(item) && !isValidElement(item);
}

/**
 * Model for ContextMenus interacting with data used by Highcharts charts.
 * @see ChartModel.contextMenu
 */
export class ChartContextMenu {
    items: MenuItemLike[] = [];

    chartModel: ChartModel = null;

    /**
     * @param {Object} c - ChartContextMenu configuration.
     * @param {(ContextMenuItem[]|Object[]|string[])} c.items - ContextMenuItems/configs or string
     *     tokens.
     *      If a String, value can be '-' for a separator,
     *      a Hoist token (`copyToClipboard`),
     *      or a token supported by HighCharts for its native menu items:
     *           `viewFullscreen`
     *           `printChart`
     *           `downloadPDF`
     *           `downloadJPEG`
     *           `downloadPNG`
     *           `downloadSVG`
     *           `downloadCSV`
     *           `downloadXLS`
     *
     * @param {ChartModel} [c.chartModel] - ChartModel to bind to this contextMenu, used to enable
     *      implementation of menu items / tokens above.
     *
     * @link https://api.highcharts.com/highcharts/exporting.buttons.contextButton.menuItems
     */
    constructor({items, chartModel}) {
        this.chartModel = chartModel;
        this.items = items.map(it => this.buildMenuItemConfig(it));
    }

    buildMenuItemConfig(item: ChartMenuItemLike) {
        if (isString(item)) return this.parseToken(item);

        // build nested menu item configs
        if (isChartMenuItem(item)) {
            if (!isEmpty(item.items)) {
                item.items = item.items.map(it => this.buildMenuItemConfig(it));
            }
            if (item.actionFn) {
                // dereference by destructuring
                // to prevent stack overflow recursion
                const {actionFn: fn} = item;
                item.actionFn = e => fn(e, this.chartModel);
            }
        }

        return item;
    }

    parseToken(token): MenuItem {
        const {chartModel} = this;

        // Chart contextMenus are currently only supported on desktop devices.
        if (!XH.isDesktop) return;

        switch (token) {
            case 'viewFullscreen':
                return {
                    text: 'View in full screen',
                    icon: Icon.expand(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.fullscreen.toggle()
                };
            case 'copyToClipboard':
                return {
                    text: 'Copy to clipboard',
                    icon: Icon.copy(),
                    hidden: !chartModel || !Highcharts.isWebKit,
                    actionFn: () => chartModel.highchart.copyToClipboardAsync()
                };
            case 'printChart':
                return {
                    text: 'Print chart',
                    icon: Icon.print(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.print()
                };
            case 'downloadJPEG':
                return {
                    text: 'Download JPEG image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () =>
                        chartModel.highchart.exportChartLocal({
                            type: 'image/jpeg'
                        })
                };
            case 'downloadPNG':
                return {
                    text: 'Download PNG image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChartLocal()
                };
            case 'downloadSVG':
                return {
                    text: 'Download SVG vector image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () =>
                        chartModel.highchart.exportChartLocal({
                            type: 'image/svg+xml'
                        })
                };
            case 'downloadPDF':
                return {
                    text: 'Download PDF',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () =>
                        chartModel.highchart.exportChartLocal({
                            type: 'application/pdf'
                        })
                };
            case 'downloadCSV':
                return {
                    text: 'Download CSV',
                    icon: Icon.fileCsv(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.downloadCSV()
                };
            case 'downloadXLS':
                return {
                    text: 'Download Excel',
                    icon: Icon.fileExcel(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.downloadXLS()
                };
            default:
                return token;
        }
    }
}
