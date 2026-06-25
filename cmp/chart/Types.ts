/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart/ChartModel';
import type {ContextMenuSpec, MenuContext, MenuToken} from '@xh/hoist/core';

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
    | 'copyToClipboard'
    | MenuToken;

export interface ChartMenuContext extends MenuContext {
    chartModel: ChartModel;
    /**
     * Single point is the active series point the mouse is closest to
     */
    point: any;
    /**
     * Points array is the list of points hovered over in each series. When
     * there are multiple series and tooltip.shared = true, points.length less than 1.
     */
    points: any[];
}

export type ChartContextMenuSpec = ContextMenuSpec<ChartMenuToken, ChartMenuContext>;
