/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, TrackOptions, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isOmitted} from '@xh/hoist/utils/impl';
import {debounced, stripTags, withDefault} from '@xh/hoist/utils/js';
import {isEmpty, isNil, isString} from 'lodash';

/**
 * Primary service for tracking any activity that an application's admins want to track.
 * Activities are available for viewing/querying in the Admin Console's Client Activity tab.
 * Client metadata is set automatically by the server's parsing of request headers.
 */
export class TrackService extends HoistService {
    static instance: TrackService;

    private oncePerSessionSent = new Map();
    private pending: PlainObject[] = [];

    override async initAsync() {
        window.addEventListener('beforeunload', () => this.pushPendingAsync());
    }

    get conf(): ActivityTrackingConfig {
        const appConfig = XH.getConf('xhActivityTrackingConfig', {});
        return {
            clientHealthReport: {intervalMins: -1},
            enabled: true,
            logData: false,
            maxDataLength: 2000,
            maxRows: {
                default: 10000,
                options: [1000, 5000, 10000, 25000]
            },
            levels: [{username: '*', category: '*', severity: 'INFO'}],
            ...appConfig
        };
    }

    get enabled(): boolean {
        return this.conf.enabled === true;
    }

    /** Track User Activity. */
    track(options: TrackOptions | string) {
        // Normalize string form, msg -> message, default severity.
        if (isString(options)) options = {message: options};
        if (isOmitted(options)) return;
        options = {
            message: withDefault(options.message, (options as any).msg),
            severity: withDefault(options.severity, 'INFO'),
            timestamp: withDefault(options.timestamp, Date.now()),
            ...options
        };

        // Short-circuit if disabled...
        if (!this.enabled) {
            this.logDebug('Activity tracking disabled - activity will not be tracked.', options);
            return;
        }

        // ...or invalid request (with warning for developer)
        if (!options.message) {
            this.logWarn('Required message not provided - activity will not be tracked.', options);
            return;
        }

        // ...or if auto-refresh
        if (options.loadSpec?.isAutoRefresh) return;

        // ...or if unauthenticated user
        if (!XH.getUsername()) return;

        // ...or if already-sent once-per-session messages
        if (options.oncePerSession) {
            const sent = this.oncePerSessionSent,
                key = options.message + '_' + (options.category ?? '');
            if (sent.has(key)) return;
            sent.set(key, true);
        }

        // Otherwise - log and queue to send with next debounced push to server.
        this.logMessage(options);

        this.pending.push(this.toServerJson(options));
        this.pushPendingBuffered();
    }

    /**
     * Flush the queue of pending activity tracking messages to the server.
     * @internal - apps should generally allow this service to manage w/its internal debounce.
     */
    async pushPendingAsync() {
        const {pending} = this;
        if (isEmpty(pending)) return;

        this.pending = [];
        await XH.fetchService.postJson({
            url: 'xh/track',
            body: {entries: pending},
            params: {clientUsername: XH.getUsername()}
        });
    }

    //------------------
    // Implementation
    //------------------
    @debounced(10 * SECONDS)
    private pushPendingBuffered() {
        this.pushPendingAsync();
    }

    private toServerJson(options: TrackOptions): PlainObject {
        const ret: PlainObject = {
            msg: stripTags(options.message),
            clientUsername: XH.getUsername(),
            appVersion: XH.getEnv('clientVersion'),
            loadId: XH.loadId,
            tabId: XH.tabId,
            url: window.location.href,
            timestamp: Date.now()
        };

        if (options.category) ret.category = options.category;
        if (options.correlationId) ret.correlationId = options.correlationId;
        if (options.data) ret.data = options.data;
        if (options.severity) ret.severity = options.severity;
        if (options.logData !== undefined) ret.logData = options.logData;
        if (options.elapsed !== undefined) ret.elapsed = options.elapsed;

        const {maxDataLength} = this.conf;
        if (ret.data?.length > maxDataLength) {
            this.logWarn(
                `Track log includes ${ret.data.length} chars of JSON data`,
                `exceeds limit of ${maxDataLength}`,
                'data will not be persisted',
                options.data
            );
            ret.data = null;
        }

        return ret;
    }

    private logMessage(opts: TrackOptions) {
        const elapsedStr = opts.elapsed != null ? `${opts.elapsed}ms` : null,
            consoleMsgs = [opts.category, opts.message, opts.correlationId, elapsedStr].filter(
                it => !isNil(it)
            );

        this.logInfo(...consoleMsgs);
    }
}

interface ActivityTrackingConfig {
    clientHealthReport?: Partial<TrackOptions> & {
        intervalMins: number;
    };
    enabled: boolean;
    logData: boolean;
    maxDataLength: number;
    maxRows?: {
        default: number;
        options: number[];
    };
    levels?: Array<{
        username: string | '*';
        category: string | '*';
        severity: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    }>;
}
