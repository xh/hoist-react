/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {merge} from 'lodash';

/**
 * Transform the "select right-to-left" gesture into "zoom out" for charts with x-axis zooming.
 * Gesture can be used in place of the default "reset zoom" button.
 */
export function installCopyToClipboard(Highcharts) {
    if (!Highcharts) return;
    const  {Chart, extend} = Highcharts;

    extend(Chart.prototype, /** @lends Highcharts.Chart.prototype */ {
        copyToClipboard: function(exportingOptions, chartOptions) {
            this.getSVGForLocalExport(
                merge(this.options.exporting, exportingOptions),
                chartOptions || {},
                () => console.log('cannot fallback to export server'),
                (svg) => getPNG(
                    svg, 
                    {}, 
                    () => console.log('failed'),
                    () => console.log('succeeded'),
                    Highcharts
                )
            );  


        } // end copyToClipboard
    }); // end extend 
} // end export


const domurl = window.URL || window.webkitURL || window;


function getPNG( // was downloadSVGLocal
    svg, // : string,
    options, // : ExportingOptions,
    failCallback, // : Function,
    successCallback, // ?: Function
    Highcharts
) {
    let svgurl, // : string,
        // blob,
        objectURLRevoke = true,
        finallyHandler, // : Function,
        // libURL = (
        //     options.libURL || (getOptions().exporting).libURL
        // ),
        // dummySVGContainer = window.document.createElement('div'),
        imageType = 'image/png',
        // filename = (
        //     (options.filename || 'chart') +
        //     '.' +
        //     (imageType === 'image/svg+xml' ? 'svg' : imageType.split('/')[1])
        // ),
        scale = options.scale || 1;

    // Allow libURL to end with or without fordward slash
    // libURL = libURL.slice(-1) !== '/' ? libURL + '/' : libURL;

    // PNG/JPEG download - create bitmap from SVG

    svgurl = svgToDataUrl(svg, Highcharts);
    finallyHandler = function() {
        try {
            domurl.revokeObjectURL(svgurl);
        } catch (e) {
            // Ignore
        }
    };
    // First, try to get PNG by rendering on canvas
    imageToDataUrl(
        svgurl,
        imageType,
        {},
        scale,
        async function(imageURL) {
            async function loadBlob(fileName) {
                const fetched = await fetch(fileName);
                return await fetched.blob();
            }
              
            const blobInput = await loadBlob(imageURL);
            const clipboardItemInput = new window.ClipboardItem({'image/png': blobInput});
            await window.navigator.clipboard.write([clipboardItemInput]);
        
        }, 
        function() {
            console.log('failed due to tainted canvas');
            // Failed due to tainted canvas
            // Create new and untainted canvas
            // const canvas = window.document.createElement('canvas'),
            //     ctx = canvas.getContext('2d'), // CanvasRenderingContext2D
            //     imageWidth = (svg.match(
            //         /^<svg[^>]*width\s*=\s*\"?(\d+)\"?[^>]*>/
            //     ))[1] * scale,
            //     imageHeight = (svg.match(
            //         /^<svg[^>]*height\s*=\s*\"?(\d+)\"?[^>]*>/
            //     ))[1] * scale,
            //     downloadWithCanVG = function() {
            //         const v = window.canvg.Canvg.fromString(ctx, svg);
            //         v.start();
            //         try {
            //             downloadURL(
            //                 window.navigator.msSaveOrOpenBlob ?
            //                     canvas.msToBlob() :
            //                     canvas.toDataURL(imageType),
            //                 filename
            //             );
            //             if (successCallback) {
            //                 successCallback();
            //             }
            //         } catch (e) {
            //             failCallback(e);
            //         } finally {
            //             finallyHandler();
            //         }
            //     };

            // canvas.width = imageWidth;
            // canvas.height = imageHeight;
            // if (window.canvg) {
            //     // Use preloaded canvg
            //     downloadWithCanVG();
            // } else {
            //     // Must load canVG first. // Don't destroy the object URL
            //     // yet since we are doing things asynchronously. A cleaner
            //     // solution would be nice, but this will do for now.
            //     objectURLRevoke = true;
            //     getScript(libURL + 'canvg.js', function() {
            //         downloadWithCanVG();
            //     });
            // }
        },
        // No canvas support
        failCallback,
        // Failed to load image
        failCallback,
        // Finally
        function() {
            if (objectURLRevoke) {
                finallyHandler();
            }
        }
    );
}


/**
 * Get blob URL from SVG code. Falls back to normal data URI.
 *
 * @private
 * @function Highcharts.svgToDataURL
 * @param {string} svg
 * @return {string}
 */
function svgToDataUrl(svg, H) {
    // Webkit and not chrome
    const userAgent = window.navigator.userAgent;
    const webKit = (
        userAgent.indexOf('WebKit') > -1 &&
        userAgent.indexOf('Chrome') < 0
    );

    try {
        // Safari requires data URI since it doesn't allow navigation to blob
        // URLs. Firefox has an issue with Blobs and internal references,
        // leading to gradients not working using Blobs (#4550).
        // foreignObjects also dont work well in Blobs in Chrome (#14780).
        if (!webKit && !H.isFirefox && svg.indexOf('<foreignObject') === -1) {
            return domurl.createObjectURL(new window.Blob([svg], {
                type: 'image/svg+xml;charset-utf-16'
            }));
        }
    } catch (e) {
        // Ignore
    }
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}


/**
 * Get data:URL from image URL. Pass in callbacks to handle results.
 *
 * @private
 * @function Highcharts.imageToDataUrl
 *
 * @param {string} imageURL
 *
 * @param {string} imageType
 *
 * @param {*} callbackArgs
 *        callbackArgs is used only by callbacks.
 *
 * @param {number} scale
 *
 * @param {Function} successCallback
 *        Receives four arguments: imageURL, imageType, callbackArgs, and scale.
 *
 * @param {Function} taintedCallback
 *        Receives four arguments: imageURL, imageType, callbackArgs, and scale.
 *
 * @param {Function} noCanvasSupportCallback
 *        Receives four arguments: imageURL, imageType, callbackArgs, and scale.
 *
 * @param {Function} failedLoadCallback
 *        Receives four arguments: imageURL, imageType, callbackArgs, and scale.
 *
 * @param {Function} [finallyCallback]
 *        finallyCallback is always called at the end of the process. All
 *        callbacks receive four arguments: imageURL, imageType, callbackArgs,
 *        and scale.
 */
function imageToDataUrl(
    imageURL, // string,
    imageType, // string,
    callbackArgs, // unknown,
    scale, // number,
    successCallback, // Function,
    taintedCallback, // Function,
    noCanvasSupportCallback, // Function,
    failedLoadCallback, // Function,
    finallyCallback // ?: Function
) {
    let img = new window.Image(),
        taintedHandler, // Function,
        loadHandler = function() {
            let canvas = window.document.createElement('canvas'),
                ctx = canvas.getContext && canvas.getContext('2d'),
                dataURL;

            try {
                if (!ctx) {
                    noCanvasSupportCallback(
                        imageURL,
                        imageType,
                        callbackArgs,
                        scale
                    );
                } else {
                    canvas.height = img.height * scale;
                    canvas.width = img.width * scale;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Now we try to get the contents of the canvas.
                    try {
                        dataURL = canvas.toDataURL(imageType);
                        successCallback(
                            dataURL,
                            imageType,
                            callbackArgs,
                            scale
                        );
                    } catch (e) {
                        taintedHandler(
                            imageURL,
                            imageType,
                            callbackArgs,
                            scale
                        );
                    }
                }
            } finally {
                if (finallyCallback) {
                    finallyCallback(
                        imageURL,
                        imageType,
                        callbackArgs,
                        scale
                    );
                }
            }
        },
        // Image load failed (e.g. invalid URL)
        errorHandler = function() {
            failedLoadCallback(imageURL, imageType, callbackArgs, scale);
            if (finallyCallback) {
                finallyCallback(imageURL, imageType, callbackArgs, scale);
            }
        };

    // This is called on load if the image drawing to canvas failed with a
    // security error. We retry the drawing with crossOrigin set to Anonymous.
    taintedHandler = function() {
        img = new window.Image();
        taintedHandler = taintedCallback;
        // Must be set prior to loading image source
        img.crossOrigin = 'Anonymous';
        img.onload = loadHandler;
        img.onerror = errorHandler;
        img.src = imageURL;
    };

    img.onload = loadHandler;
    img.onerror = errorHandler;
    img.src = imageURL;
}