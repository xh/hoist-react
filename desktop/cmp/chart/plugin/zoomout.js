/**
 * Highcharts "plugin" to transform the "select right-to-left" gesture into "zoom out" for charts with x-axis zooming.
 * The new gesture can be used in place of the default "reset zoom" button.
 */

export function zoomout(Highcharts) {
    Highcharts.wrap(Highcharts.Chart.prototype, 'init', function(proceed) {
        proceed.apply(this, Array.prototype.slice.call(arguments, 1));

        const container = this.container;

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
                this.zoom();   // call w/o arguments resets zoom
                e.preventDefault();
            }
        });
    });
}
