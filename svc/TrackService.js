/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/core';
import {stripTags} from 'hoist/utils/HtmlUtils';

export class TrackService extends BaseService {

    /**
     * Create a Track Log entry.
     * Client metadata is set automatically by the server's parsing of request headers.
     *
     * @param {Object|string} options - if a string, it will become the msg value.
     * @param {string} [options.msg] - user-supplied message. Required if options is an object.
     * @param {string} [options.category] - user-supplied category.
     * @param {Object|Array} [options.data] - user-supplied data collection.
     * @param {number} [options.elapsed] - time in milliseconds some activity took.
     * @param {string} [options.severity] - level flag, such as: OK|WARN|OMG
     *                 (errors should be tracked by the ErrorTrackingService, not sent
     *                 in this TrackService).
     */
    track(options) {
        const params = {msg: stripTags(typeof options === 'string' ? options : options.msg)};
        try {
            if (options.category)               params.category = options.category;
            if (options.data)                   params.data = JSON.stringify(options.data);
            if (options.elapsed !== undefined)  params.elapsed = options.elapsed;
            if (options.severity)               params.severity = options.severity;

            const consoleMsg =
                [params.category, params.msg, params.elapsed]
                    .filter(it => it != null)
                    .join(' | ');

            console.log(consoleMsg);

            XH.fetchJson({
                url: 'hoistImpl/track',
                params: params
            });
        } catch (e) {
            console.error('Failure tracking message: ' + params.msg);
        }
    }
}
