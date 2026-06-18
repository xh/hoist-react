/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ChartMenuContext, ChartMenuToken} from '@xh/hoist/cmp/chart/Types';
import {logWarn} from '@xh/hoist/utils/js';
import {cloneDeep, isEmpty, isString} from 'lodash';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {isMenuItem, type MenuItem, type MenuItemLike} from '@xh/hoist/core';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {Icon} from '@xh/hoist/icon';

/** @internal */
export function getContextMenuItems(
    items: MenuItemLike<ChartMenuToken>[],
    context: ChartMenuContext
): (MenuItem<ChartMenuToken, ChartMenuContext> | '-')[] {
    return cloneDeep(items).map(it => buildMenuItemConfig(it, context));
}

//---------------------------
// Implementation
//---------------------------
function buildMenuItemConfig(
    item: MenuItemLike<ChartMenuToken, ChartMenuContext>,
    context: ChartMenuContext
): MenuItem<ChartMenuToken, ChartMenuContext> | '-' {
    if (isString(item)) return parseToken(item, context.chartModel);

    // build nested menu item configs
    if (isMenuItem(item)) {
        if (!isEmpty(item.items)) {
            (item.items as (MenuItem<ChartMenuToken, ChartMenuContext> | '-')[]) = item.items.map(
                it => buildMenuItemConfig(it as MenuItemLike, context)
            );
        }
        if (item.actionFn) {
            const fn = item.actionFn;
            item.actionFn = e => fn(e, context);
        }
        if (item.prepareFn) {
            const fn = item.prepareFn;
            item.prepareFn = item => fn(item, context);
        }
    }

    return item as MenuItem<ChartMenuToken, ChartMenuContext>;
}

function parseToken(
    token: string,
    chartModel: ChartModel
): MenuItem<ChartMenuToken, ChartMenuContext> | '-' {
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
