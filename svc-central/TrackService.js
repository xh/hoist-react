/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {stripTags} from '@xh/hoist/utils/js';

@HoistService
export class TrackService {

    /**
     * Primary service for tracking any activity that an application's admins want to track.
     * Activities are presented to admins in the Admin App's Client Activity > Activity grid.
     * Client metadata is set automatically by the server's parsing of request headers.
     *
     * @param {(Object|string)} options - if a string, it will become the message value.
     * @param {string} [options.msg] - Short description of the activity being tracked.
     *      Required if options is an object.
     *      Can be passed as `message` for backwards compatibility.
     * @param {string} [options.category] - app-supplied category.
     * @param {(Object|Object[])} [options.data] - app-supplied data collection.
     * @param {number} [options.elapsed] - time in milliseconds the activity took.
     * @param {string} [options.severity] - importance flag, such as: OK|WARN|EMERGENCY
     *      (errors should be tracked by the ErrorTrackingService, not sent in this TrackService).
     */
    track(options) {
        let msg = options;
        if (typeof msg !== 'string') {
            msg = options.msg !== undefined ? options.msg : options.message;
        }

        const username = XH.getUsername();
        if (!username) return;

        const params = {
            msg: stripTags(msg),
            clientUsername: username
        };

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

            // XH.fetchJson({
            //     url: 'xh/track',
            //     params: params
            // });
        } catch (e) {
            console.error('Failure tracking message: ' + params.msg);
        }
    }
}
