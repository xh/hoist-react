/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {ContextMenuItem} from '@xh/hoist/desktop/cmp/contextmenu';
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
     *      a Hoist token (below),
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
     *      Hoist tokens, all of which require a ChartModel:
     *          `copyChart` - copy chart as PNG img to clipboard.
     *          
     * @param {ChartModel} [c.chartModel] - ChartModel to bind to this contextMenu, used to enable
     *      implementation of menu items / tokens above.
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
            case 'downloadPNG':
                return new ContextMenuItem({
                    text: 'Download PNG image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChart()
                });
            case 'downloadSVG':
                return new ContextMenuItem({
                    text: 'Download SVG vector image',
                    icon: Icon.fileImage(),
                    hidden: !chartModel,
                    actionFn: () => chartModel.highchart.exportChart({
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
