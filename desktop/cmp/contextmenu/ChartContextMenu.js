/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {ContextMenuItem} from '@xh/hoist/desktop/cmp/contextmenu';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {Icon} from '@xh/hoist/icon';


/**
 * Model for ContextMenus interacting with data used by Highcharts charts.
 * @see ChartModel.contextMenu
 */
export class ChartContextMenu {

    /** @member {MenuItem[]} */
    items = [];
    /** @member {ChartModel} */
    chartModel = null;

    /**
     * @param {Object} c - ChartContextMenu configuration.
     * @param {string[]} c.items -  string tokens.
     *      String value can be '-' for a separator, 
     *      a Hoist token (`copyToClipboard`),
     *      or a token from this subset supported by HighCharts for its native menu items:
     *           `viewFullscreen`
     *           `printChart`
     *           `downloadCSV`
     *           `downloadPNG`
     *           `downloadSVG`
     *          
     * @param {ChartModel} [c.chartModel] - ChartModel to bind to this contextMenu, used to enable
     *      implementation of menu items / tokens above.
     * 
     * @link https://api.highcharts.com/highcharts/exporting.buttons.contextButton.menuItems
     */
    constructor({items, chartModel}) {
        this.chartModel = chartModel;
        this.items = items.map(it => this.parseToken(it));
    }

    parseToken(token) {
        const {chartModel} = this;

        // Chart contextMenus are currently only supported on desktop devices.
        if (!XH.isDesktop) return;

        switch (token) {
            case 'viewFullscreen':
                return new ContextMenuItem({
                    text: 'View in full screen',
                    icon: Icon.expand(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.fullscreen.toggle()
                });
            case 'copyToClipboard':
                return new ContextMenuItem({
                    text: 'Copy to clipboard',
                    icon: Icon.copy(),
                    hidden: !chartModel || !Highcharts.isWebKit,
                    actionFn: () => {
                        const chart = chartModel.highchart;
                        chart.copyToClipboardAsync();
               
                    }
                });
            case 'printChart':
                return new ContextMenuItem({
                    text: 'Print chart',
                    icon: Icon.print(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.print()
                });
            case 'downloadPNG':
                return new ContextMenuItem({
                    text: 'Download PNG image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChartLocal()
                });
            case 'downloadSVG':
                return new ContextMenuItem({
                    text: 'Download SVG vector image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChartLocal({
                        type: 'image/svg+xml'
                    })
                });
            case 'downloadCSV':
                return new ContextMenuItem({
                    text: 'Download CSV',
                    icon: Icon.fileCsv(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.downloadCSV()
                });
            default:
                return token;
        }
    }
}
