/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

/**
 * Transform the "select right-to-left" gesture into "zoom out" for charts with x-axis zooming.
 * Gesture can be used in place of the default "reset zoom" button.
 */
export function installZoomoutGesture(Highcharts) {
    if (!Highcharts) return;
    Highcharts.wrap(Highcharts.Chart.prototype, 'init', function (proceed) {
        proceed.apply(this, Array.prototype.slice.call(arguments, 1));

        const {container} = this;

        if (this.options.chart.zoomType != 'x') return;

        let selectFrom, selectTo, pixelDiff;
        Highcharts.addEvent(container, 'mousedown', e => {
            selectFrom = this.pointer.normalize(e).chartX;
        });

        Highcharts.addEvent(container, 'mouseup', e => {
            selectTo = this.pointer.normalize(e).chartX;
            pixelDiff = selectTo - selectFrom;
        });

        Highcharts.addEvent(this, 'selection', e => {
            if (pixelDiff < 0) {
                this.xAxis?.forEach(it => it.setExtremes());
                e.preventDefault();
            }
        });
    });
}
