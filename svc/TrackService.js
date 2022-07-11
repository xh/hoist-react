/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {stripTags, withDefault} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

export class TrackService extends HoistService {

    _oncePerSessionSent = {};

    /**
     * Primary service for tracking any activity that an application's admins want to track.
     * Activities are presented to admins in the Admin App's Client Activity > Activity grid.
     * Client metadata is set automatically by the server's parsing of request headers.
     *
     * @param {(Object|string)} options - if a string, it will become the message value.
     * @param {string} [options.message] - Short description of the activity being tracked.
     *      Required if options is an object. Can be passed as `msg` for backwards compatibility.
     * @param {string} [options.category] - app-supplied category.
     * @param {(Object|Object[])} [options.data] - app-supplied data to save along with track log.
     * @param {number} [options.elapsed] - time in milliseconds the activity took.
     * @param {string} [options.severity] - flag to indicate relative importance of activity.
     *      Default 'INFO'. Note, errors should be tracked via `XH.handleException()`, which
     *      will post to the server for dedicated logging if requested. {@see ExceptionHandler}
     * @param {boolean} [options.oncePerSession] - set to true to log this message only once during
     *      the current session.  The unique key identifying this message for this purpose will be
     *      comprised of the category and the message.
     * @param {LoadSpec} [options.loadSpec] - optional LoadSpec associated with this track.
     *      If the loadSpec indicates this is an auto-refresh, tracking will be skipped.
     */
    track(options) {
        // Normalize string form, msg -> message, default severity.
        if (isString(options)) options = {message: options};
        options.message = withDefault(options.message, options.msg);
        options.severity = withDefault(options.severity, 'INFO');

        if (!options.message) {
            console.warn('Tracking requires a message - activity will not be tracked.');
            return;
        }

        // Short-circuit tracks from auto-refreshes and unauthenticated users.
        const username = XH.getUsername();
        if (!username || (options.loadSpec && options.loadSpec.isAutoRefresh)) return;

        // Short-circuit already sent once-per-session messages
        const key = options.message + '_' + (options.category ?? '');
        if (options.oncePerSession && this._oncePerSessionSent[key]) return;

        const params = {
            msg: stripTags(options.message),
            clientUsername: username
        };

        try {
            if (options.category)               params.category = options.category;
            if (options.data)                   params.data = JSON.stringify(options.data);
            if (options.elapsed !== undefined)  params.elapsed = options.elapsed;
            if (options.severity)               params.severity = options.severity;

            const elapsedStr = params.elapsed != null ? `${params.elapsed}ms` : null,
                consoleMsg = ['[Track]', params.category, params.msg, elapsedStr]
                    .filter(it => it != null)
                    .join(' | ');

            console.log(consoleMsg);

            XH.fetchJson({url: 'xh/track', params});

            if (options.oncePerSession) {
                this._oncePerSessionSent[key] = true;
            }

        } catch (e) {
            console.error('Failure tracking message: ' + params.msg);
        }
    }
}
