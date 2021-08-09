/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {merge} from 'lodash';

/**
 * Transform the "select right-to-left" gesture into "zoom out" for charts with x-axis zooming.
 * Gesture can be used in place of the default "reset zoom" button.
 */
export function installCopyToClipboard(Highcharts) {
    if (!Highcharts) return;
    const  {Chart, extend} = Highcharts;

    extend(Chart.prototype, /** @lends Highcharts.Chart.prototype */ {
        copyToClipboard: async function(exportingOptions, chartOptions) {

            if (!Highcharts.isWebKit) {
                XH.dangerToast('Copying charts to the cliboard is not supported on this browser');
                return;
            }

            let clipboardItemInput;
            if (Highcharts.isSafari) {
                clipboardItemInput = new window.ClipboardItem({
                    'image/png': new Promise((resolve, reject) => {
                        convertChartToPngAsync(this, exportingOptions, chartOptions)
                            .then(resolve);
                    })
                });
            } else {
                const pngBlob = await convertChartToPngAsync(this, exportingOptions, chartOptions);
                clipboardItemInput = new window.ClipboardItem({'image/png': pngBlob});
            }

            const error = await window.navigator.clipboard.write([clipboardItemInput]);
            if (!error) {
                XH.successToast('Chart copied to clipboard');
            } else {
                XH.handleException(error);
            }

        } // end copyToClipboard
    }); // end extend 
} // end export


async function convertChartToPngAsync(chart, exportingOptions, chartOptions) {
    const svg = await new Promise(
            (resolve, reject)  => chart.getSVGForLocalExport(
                merge(chart.options.exporting, exportingOptions),
                chartOptions || {},
                () => reject('cannot fallback to export server'),
                (svg) => resolve(svg)
            )
        ),
        svgUrl = svgToDataUrl(svg),
        pngDataUrl = await imageToDataUrlAsync(svgUrl, exportingOptions?.scale),
        ret = await loadBlob(pngDataUrl);

    memoryCleanup(svgUrl);
    return ret;
}

const domurl = window.URL || window.webkitURL || window;
function memoryCleanup(svgUrl) {
    try {
        domurl.revokeObjectURL(svgUrl);
    } catch (e) {
        // Ignore
    }
}

async function loadBlob(dataUrl) {
    const fetched = await fetch(dataUrl);
    return await fetched.blob();
}

/**
 * Get blob URL from SVG code. Falls back to normal data URI for Safari
 *
 * @private
 * @function svgToDataURL
 * @param {string} svg
 * @return {string}
 */
function svgToDataUrl(svg) {
    // Webkit and not chrome
    const userAgent = window.navigator.userAgent;
    const isWebKitButNotChrome = (
        userAgent.indexOf('WebKit') > -1 &&
        userAgent.indexOf('Chrome') < 0
    );

    try {
        // Safari requires data URI since it doesn't allow navigation to blob
        // URLs.
        // foreignObjects dont work well in Blobs in Chrome (#14780).
        if (!isWebKitButNotChrome && svg.indexOf('<foreignObject') === -1) {
            return domurl.createObjectURL(new window.Blob([svg], {
                type: 'image/svg+xml;charset-utf-16'
            }));
        }
    } catch (e) {
        // Ignore
    }

    // safari, firefox, or svgs with foreignObect returns this
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}


/**
 * Get data:URL from image URL. Pass in callbacks to handle results.
 *
 * @private
 * @function imageToDataUrl
 * @param {string} imageURL
 * @param {number} scale
 */
async function imageToDataUrlAsync(imageURL, scale = 1) {
    const img = new window.Image(),
        loadHandler = function(resolve, reject) {
            const canvas = window.document.createElement('canvas'),
                ctx = canvas.getContext && canvas.getContext('2d');

            canvas.height = img.height * scale;
            canvas.width = img.width * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Now we try to get the contents of the canvas.
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (e) {
                reject(e);
            }
        };

    return new Promise((resolve, reject) => {
        img.onload = () => loadHandler(resolve, reject);
        img.onerror = reject;
        img.src = imageURL;
    });
}