import {type MouseEvent} from 'react';
import {ChartModel} from '@xh/hoist/cmp/chart/ChartModel';
import {MenuItem} from '@xh/hoist/core';

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
export type ChartMenuItemLike = ChartMenuItem | ChartMenuToken | '-';

/**
 * Specification for a ChartContextMenu.
 * Can also take a custom list of {@link ChartMenuToken} strings, {@link ChartMenuItem} configuration
 * objects, or a function returning the same. Set to `true` for a default ContextMenu.
 */
export type ChartContextMenuSpec =
    | boolean
    | ChartMenuItemLike[]
    | ((chartModel: ChartModel) => ChartMenuItemLike[]);
