/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {logWarn} from '@xh/hoist/utils/js';
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
export type ChartMenuToken =
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
        menuItemEvent: MouseEvent | PointerEvent,
        contextMenuEvent: MouseEvent | PointerEvent,
        params: {
            chartModel: ChartModel;
            /**
             * Single point is the active series point the mouse is closest to
             */
            point: any;
            /**
             * Points array is the list of points hovered over in each series. When
             * there are multiple series and tooltip.shared = true, points.length > 1.
             */
            points: any[];
        }
    ) => void;
}

/**
 * If a String, value can be '-' for a separator, or a token supported by HighCharts
 * for its native menu items, or a Hoist specific token.
 */
export type ChartContextMenuItemLike = ChartMenuItem | ChartMenuToken | '-';

/**
 * Specification for a ChartContextMenu.  Either a list of items or a function to produce one.
 */
export type ChartContextMenuSpec =
    | boolean
    | ChartContextMenuItemLike[]
    | ((chartModel: ChartModel) => ChartContextMenuItemLike[]);

/** @internal */
export function getChartContextMenuItems(
    items: ChartContextMenuItemLike[],
    contextMenuEvent: MouseEvent | PointerEvent,
    chartModel: ChartModel,
    point,
    points
) {
    return cloneDeep(items).map(it =>
        buildMenuItemConfig(it, contextMenuEvent, chartModel, point, points)
    );
}

//---------------------------
// Implementation
//---------------------------
function buildMenuItemConfig(
    item: ChartContextMenuItemLike,
    contextMenuEvent: MouseEvent | PointerEvent,
    chartModel: ChartModel,
    point,
    points
): MenuItem | string {
    if (isString(item)) return parseToken(item, chartModel);

    // build nested menu item configs
    if (isMenuItem(item)) {
        if (!isEmpty(item.items)) {
            item.items = item.items.map(it =>
                buildMenuItemConfig(
                    it as ChartContextMenuItemLike,
                    contextMenuEvent,
                    chartModel,
                    point,
                    points
                )
            );
        }
        if (item.actionFn) {
            const fn = item.actionFn as ChartMenuItem['actionFn'];
            item.actionFn = e => {
                fn(e, contextMenuEvent, {chartModel, point, points});
            };
        }
    }

    return item as MenuItem;
}

function parseToken(token: string, chartModel: ChartModel): MenuItem | '-' {
    switch (token) {
        case 'viewFullscreen':
            return {
                text: 'View in full screen',
                icon: Icon.expand(),
                actionFn: () => chartModel.highchart.fullscreen.toggle()
            };
        case 'copyToClipboard':
            return {
                text: 'Copy to clipboard',
                icon: Icon.copy(),
                hidden: !Highcharts.isWebKit,
                actionFn: () => chartModel.highchart.copyToClipboardAsync()
            };
        case 'printChart':
            return {
                text: 'Print chart',
                icon: Icon.print(),
                actionFn: () => chartModel.highchart.print()
            };
        case 'downloadJPEG':
            return {
                text: 'Download JPEG image',
                icon: Icon.fileImage(),
                actionFn: () =>
                    chartModel.highchart.exportChartLocal({
                        type: 'image/jpeg'
                    })
            };
        case 'downloadPNG':
            return {
                text: 'Download PNG image',
                icon: Icon.fileImage(),
                actionFn: () => chartModel.highchart.exportChartLocal()
            };
        case 'downloadSVG':
            return {
                text: 'Download SVG vector image',
                icon: Icon.fileImage(),
                actionFn: () =>
                    chartModel.highchart.exportChartLocal({
                        type: 'image/svg+xml'
                    })
            };
        case 'downloadPDF':
            return {
                text: 'Download PDF',
                icon: Icon.fileImage(),
                actionFn: () =>
                    chartModel.highchart.exportChartLocal({
                        type: 'application/pdf'
                    })
            };
        case 'downloadCSV':
            return {
                text: 'Download CSV',
                icon: Icon.fileCsv(),
                actionFn: () => chartModel.highchart.downloadCSV()
            };
        case 'downloadXLS':
            return {
                text: 'Download Excel',
                icon: Icon.fileExcel(),
                actionFn: () => chartModel.highchart.downloadXLS()
            };
        case '-':
            return '-';
        default:
            logWarn(
                `Invalid ChartMenuToken "${token}" will not be used.`,
                'ChartContextMenuItem.ts:parseToken'
            );
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
