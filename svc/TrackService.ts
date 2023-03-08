/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistService, XH, TrackOptions} from '@xh/hoist/core';
import {isOmitted} from '@xh/hoist/utils/impl';
import {stripTags, withDefault} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

/**
 * Primary service for tracking any activity that an application's admins want to track.
 * Activities are available for viewing/querying in the Admin Console's Client Activity tab.
 * Client metadata is set automatically by the server's parsing of request headers.
 */
export class TrackService extends HoistService {
    static instance: TrackService;

    private _oncePerSessionSent = {};

    /** Track User Activity. */
    track(options: TrackOptions | string) {
        // Normalize string form, msg -> message, default severity.
        if (isString(options)) options = {message: options};
        if (isOmitted(options)) return;
        options.message = withDefault(options.message, (options as any).msg);
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

        const params: any = {
            msg: stripTags(options.message),
            clientUsername: username
        };

        try {
            if (options.category) params.category = options.category;
            if (options.data) params.data = JSON.stringify(options.data);
            if (options.elapsed !== undefined) params.elapsed = options.elapsed;
            if (options.severity) params.severity = options.severity;

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
