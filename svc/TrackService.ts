/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, TrackOptions, XH} from '@xh/hoist/core';
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

    private _oncePerSessionSent = new Map();

    get conf() {
        return XH.getConf('xhActivityTrackingConfig', {
            enabled: true,
            maxDataLength: 2000,
            maxRows: {
                default: 10000,
                options: [1000, 5000, 10000, 25000]
            },
            logData: false
        });
    }

    get enabled(): boolean {
        return this.conf.enabled === true;
    }

    /** Track User Activity. */
    track(options: TrackOptions | string) {
        // Normalize string form, msg -> message, default severity.
        if (isString(options)) options = {message: options};
        if (isOmitted(options)) return;
        options.message = withDefault(options.message, (options as any).msg);
        options.severity = withDefault(options.severity, 'INFO');

        // Short-circuit if disabled...
        if (!this.enabled) {
            this.logDebug('Activity tracking disabled - activity will not be tracked.', options);
            return;
        }

        // ...or invalid request (with warning for developer)...
        if (!options.message) {
            this.logWarn('Required message not provided - activity will not be tracked.', options);
            return;
        }

        // ...or if auto-refresh...
        if (options.loadSpec?.isAutoRefresh) return;

        // ...or if unauthenticated user...
        if (!XH.getUsername()) return;

        // ...or if already-sent once-per-session messages.
        const key = options.message + '_' + (options.category ?? '');
        if (options.oncePerSession && this._oncePerSessionSent.has(key)) return;

        // Otherwise - fire off (but do not await) request.
        this.doTrackAsync(options);

        if (options.oncePerSession) {
            this._oncePerSessionSent.set(key, true);
        }
    }

    //------------------
    // Implementation
    //------------------
    private async doTrackAsync(options: TrackOptions) {
        try {
            const params: any = {
                msg: stripTags(options.message),
                clientUsername: XH.getUsername()
            };

            if (options.category) params.category = options.category;
            if (options.data) params.data = JSON.stringify(options.data);
            if (options.severity) params.severity = options.severity;
            if (options.logData !== undefined) params.logData = options.logData.toString();
            if (options.elapsed !== undefined) params.elapsed = options.elapsed;

            const {maxDataLength} = this.conf;
            if (params.data?.length > maxDataLength) {
                this.logWarn(
                    `Track log includes ${params.data.length} chars of JSON data`,
                    `exceeds limit of ${maxDataLength}`,
                    'data will not be persisted',
                    options.data
                );
                params.data = null;
            }

            const elapsedStr = params.elapsed != null ? `${params.elapsed}ms` : null,
                consoleMsgs = [params.category, params.msg, elapsedStr].filter(it => it != null);

            this.logInfo(...consoleMsgs);

            await XH.fetchJson({url: 'xh/track', params});
        } catch (e) {
            this.logError('Failed to persist track log', options, e);
        }
    }
}
