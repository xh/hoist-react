/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {isValidElement, MouseEvent, ReactNode} from 'react';
import {cloneDeep, isEmpty, isString} from 'lodash';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {MenuItem} from '@xh/hoist/core';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {Icon} from '@xh/hoist/icon';

/**
 * Highcharts supported tokens {@link https://api.highcharts.com/highcharts/exporting.buttons.contextButton.menuItems}
 * plus Hoist's `copyToClipboard`.
 */
export type ChartContextMenuToken =
    | 'viewFullscreen'
    | 'printChart'
    | 'downloadJPEG'
    | 'downloadPNG'
    | 'downloadSVG'
    | 'downloadCSV'
    | 'downloadXLS'
    | 'downloadPDF'
    | 'copyToClipboard';

export interface ChartMenuItem extends Omit<MenuItem, 'actionFn' | 'items'> {
    items?: ChartMenuItemLike[];
    actionFn?: (
        menuItemClickEvt: MouseEvent | PointerEvent,
        contextMenuClickEvt: MouseEvent | PointerEvent,
        chartModel: ChartModel,
        point
    ) => void;
}

/**
 * If a String, value can be '-' for a separator, or a token supported by HighCharts
 * for its native menu items, or a Hoist specific token.
 */
export type ChartContextMenuItemLike = ChartMenuItem | ChartContextMenuToken | string;

/**
 * Specification for a ChartContextMenu.  Either a list of items, or a function to produce one.
 */
export type ChartContextMenuSpec =
    | boolean
    | ChartContextMenuItemLike[]
    | ((chartModel: ChartModel) => ChartContextMenuItemLike[]);

/**
 * Model for ContextMenus interacting with data used by Highcharts charts.
 * @see ChartModel.contextMenu
 */
export class ChartContextMenu {
    items: MenuItem[] = [];
    chartModel: ChartModel = null;
    contextMenuEvent;
    point;

    constructor({items, chartModel, contextMenuEvent, point}) {
        this.chartModel = chartModel;
        this.contextMenuEvent = contextMenuEvent;
        this.point = point;
        this.items = cloneDeep(items).map(it => this.buildMenuItemConfig(it));
    }

    buildMenuItemConfig(item: ChartContextMenuItemLike): MenuItem | string {
        if (isString(item)) return this.parseToken(item);

        // build nested menu item configs
        if (isMenuItem(item)) {
            if (!isEmpty(item.items)) {
                item.items = item.items.map(it =>
                    this.buildMenuItemConfig(it as ChartContextMenuItemLike)
                );
            }
            if (item.actionFn) {
                const fn = item.actionFn as ChartMenuItem['actionFn'];
                item.actionFn = e => {
                    fn(e, this.contextMenuEvent, this.chartModel, this.point);
                };
            }
        }

        return item as MenuItem;
    }

    private parseToken(token: string): MenuItem | string {
        const {chartModel} = this;

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

function isMenuItem(item: ChartMenuItemLike): item is MenuItem {
    return !isString(item) && !isValidElement(item);
}

/**
 * An item that can exist in a Menu.
 *
 * Allows for a ReactNode as divider.  If strings are specified, the implementations may choose
 * an appropriate default display, with '-' providing a standard textless divider that will also
 * be de-duped if appearing at the beginning, or end, or adjacent to another divider at render time.
 */
type ChartMenuItemLike = ChartMenuItem | ReactNode;
