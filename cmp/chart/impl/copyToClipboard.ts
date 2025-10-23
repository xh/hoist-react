/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';

/**
 * Copy the chart in its current state to the clipboard - supported for webkit based browsers only.
 * @internal
 */
export function installCopyToClipboard(Highcharts) {
    if (!Highcharts) return;
    const {Chart, extend} = Highcharts;

    extend(Chart.prototype, {
        copyToClipboardAsync: async function () {
            if (!Highcharts.isWebKit) {
                XH.dangerToast('Copying charts to the clipboard is not supported on this browser');
                return;
            }

            try {
                const blobPromise = convertChartToPngAsync(this),
                    clipboardItemInput = new window.ClipboardItem({
                        // Safari requires an unresolved promise. See https://bugs.webkit.org/show_bug.cgi?id=222262 for discussion
                        'image/png': Highcharts.isSafari ? blobPromise : await blobPromise
                    });
                await window.navigator.clipboard.write([clipboardItemInput]);
                XH.successToast('Chart copied to clipboard');
            } catch (e) {
                XH.handleException(e, {showAlert: false, logOnServer: true});
                XH.dangerToast('Error: Chart could not be copied. This error has been logged.');
            }
        }
    });
}

//------------------
// Implementation
//------------------
async function convertChartToPngAsync(chart) {
    // v12 replacement for getSVGForLocalExport
    const svg = chart.getSVG(),
        svgUrl = svgToDataUrl(svg),
        pngDataUrl = await svgUrlToPngDataUrlAsync(svgUrl),
        ret = await loadBlob(pngDataUrl);

    memoryCleanup(svgUrl);
    return ret;
}

const domurl = window.URL || window.webkitURL || (window as any);
function memoryCleanup(svgUrl) {
    try {
        domurl.revokeObjectURL(svgUrl);
    } catch (e) {}
}

/**
 * Convert dataUri to blob
 */
async function loadBlob(dataUrl) {
    const fetched = await fetch(dataUrl);
    return fetched.blob();
}

/**
 * Get blob URL from SVG code. Falls back to normal data URI for Safari
 */
function svgToDataUrl(svg) {
    // Webkit and not chrome
    const userAgent = window.navigator.userAgent;
    const isWebKitButNotChrome =
        userAgent.indexOf('WebKit') > -1 && userAgent.indexOf('Chrome') < 0;

    try {
        // Safari requires data URI since it doesn't allow navigation to blob
        // URLs.
        // foreignObjects don't work well in Blobs in Chrome (#14780).
        if (!isWebKitButNotChrome && svg.indexOf('<foreignObject') === -1) {
            return domurl.createObjectURL(
                new window.Blob([svg], {
                    type: 'image/svg+xml;charset-utf-16'
                })
            );
        }
    } catch (e) {}

    // Safari, Firefox, or SVGs with foreignObject fallback
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

/**
 * Get PNG data:URL from image URL.
 */
async function svgUrlToPngDataUrlAsync(imageURL, scale = 1) {
    const img = new window.Image(),
        loadHandler = function (resolve, reject) {
            const canvas = window.document.createElement('canvas'),
                ctx = canvas.getContext && canvas.getContext('2d');

            canvas.height = img.height * scale;
            canvas.width = img.width * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Now we try to get the contents of the canvas.
            try {
                const ret = canvas.toDataURL('image/png');
                resolve(ret);
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
