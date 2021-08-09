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
import {flatten, isEmpty, isString} from 'lodash';

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
     * @param {(ContextMenuItem[]|Object[]|string[])} c.items - ContextMenuItems/configs or string
     *     tokens.
     *      If a String, value can be '-' for a separator, 
     *      a Hoist token (`copyToClipboard`),
     *      or a token supported by HighCharts for its native menu items:
     *           `viewFullscreen`
     *           `printChart`
     *           `downloadCSV`
     *           `downloadJPEG`
     *           `downloadPDF`
     *           `downloadPNG`
     *           `downloadSVG`
     *           `downloadXLS`
     *          
     * @param {ChartModel} [c.chartModel] - ChartModel to bind to this contextMenu, used to enable
     *      implementation of menu items / tokens above.
     * 
     * @link https://api.highcharts.com/highcharts/exporting.buttons.contextButton.menuItems
     */
    constructor({items, chartModel}) {
        this.chartModel = chartModel;
        this.items = flatten(items.map(it => this.buildMenuItem(it)));
    }

    buildMenuItem(item) {
        if (isString(item)) return this.parseToken(item);

        if (item.actionFn) {
            // dereference by destructuring
            // to prevent stack overflow recursion
            const {actionFn: fn} = item;
            item.actionFn = () => fn(this.chartModel);
        }
        const ret = (item instanceof ContextMenuItem) ? item : new ContextMenuItem(item);

        // build nested menu items
        if (!isEmpty(ret.items)) {
            ret.items = ret.items.map(it => this.buildMenuItem(it));
        }

        return ret;
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
                        chart.copyToClipboard();
               
                    }
                });
            case 'printChart':
                return new ContextMenuItem({
                    text: 'Print chart',
                    icon: Icon.print(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.print()
                });
            case 'downloadJPEG':
                return new ContextMenuItem({
                    text: 'Download JPEG image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChartLocal({
                        type: 'image/jpeg'
                    })
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
            case 'downloadPDF':
                return new ContextMenuItem({
                    text: 'Download PDF',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChartLocal({
                        type: 'application/pdf'
                    })
                });
            case 'downloadCSV':
                return new ContextMenuItem({
                    text: 'Download CSV',
                    icon: Icon.fileCsv(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.downloadCSV()
                });
            case 'downloadXLS':
                return new ContextMenuItem({
                    text: 'Download Excel',
                    icon: Icon.fileExcel(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.downloadXLS()
                });
            default:
                return token;
        }
    }
}
