/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ChartMenuItem, ChartMenuItemLike} from '@xh/hoist/cmp/chart/Types';
import {logWarn} from '@xh/hoist/utils/js';
import {isValidElement, MouseEvent} from 'react';
import {cloneDeep, isEmpty, isString} from 'lodash';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {MenuItem} from '@xh/hoist/core';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {Icon} from '@xh/hoist/icon';

/** @internal */
export function getChartContextMenuItems(
    items: ChartMenuItemLike[],
    contextMenuEvent: MouseEvent | PointerEvent,
    chartModel: ChartModel,
    point,
    points
): (MenuItem | '-')[] {
    return cloneDeep(items).map(it =>
        buildMenuItemConfig(it, contextMenuEvent, chartModel, point, points)
    );
}

//---------------------------
// Implementation
//---------------------------
function buildMenuItemConfig(
    item: ChartMenuItemLike,
    contextMenuEvent: MouseEvent | PointerEvent,
    chartModel: ChartModel,
    point,
    points
): MenuItem | '-' {
    if (isString(item)) return parseToken(item, chartModel);

    // build nested menu item configs
    if (!isValidElement(item)) {
        if (!isEmpty(item.items)) {
            (item.items as (MenuItem | '-')[]) = item.items.map(it =>
                buildMenuItemConfig(
                    it as ChartMenuItemLike,
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
