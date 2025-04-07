/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, TrackOptions, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {isOmitted} from '@xh/hoist/utils/impl';
import {debounced, getClientDeviceInfo, stripTags, withDefault} from '@xh/hoist/utils/js';
import {isEmpty, isNil, isString, round} from 'lodash';

/**
 * Primary service for tracking any activity that an application's admins want to track.
 * Activities are available for viewing/querying in the Admin Console's Client Activity tab.
 * Client metadata is set automatically by the server's parsing of request headers.
 */
export class TrackService extends HoistService {
    static instance: TrackService;

    private clientHealthReportSources: Map<string, () => any> = new Map();
    private oncePerSessionSent = new Map();
    private pending: PlainObject[] = [];

    override async initAsync() {
        const {clientHealthReport} = this.conf;
        if (clientHealthReport?.intervalMins > 0) {
            Timer.create({
                runFn: () => this.sendClientHealthReport(),
                interval: clientHealthReport.intervalMins,
                intervalUnits: MINUTES,
                delay: true
            });
        }

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
     * Register a new source for client health report data. No-op if background health report is
     * not generally enabled via `xhActivityTrackingConfig.clientHealthReport.intervalMins`.
     *
     * @param key - key under which to report the data - can be used to remove this source later.
     * @param callback - function returning serializable to include with each report.
     */
    addClientHealthReportSource(key: string, callback: () => any) {
        this.clientHealthReportSources.set(key, callback);
    }

    /** Unregister a previously-enabled source for client health report data. */
    removeClientHealthReportSource(key: string) {
        this.clientHealthReportSources.delete(key);
    }

    //------------------
    // Implementation
    //------------------
    private async pushPendingAsync() {
        const {pending} = this;
        if (isEmpty(pending)) return;

        this.pending = [];
        await XH.fetchService.postJson({
            url: 'xh/track',
            body: {entries: pending},
            params: {clientUsername: XH.getUsername()}
        });
    }

    @debounced(10 * SECONDS)
    private pushPendingBuffered() {
        this.pushPendingAsync();
    }

    private toServerJson(options: TrackOptions): PlainObject {
        const ret: PlainObject = {
            msg: stripTags(options.message),
            clientUsername: XH.getUsername(),
            appVersion: XH.getEnv('clientVersion'),
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

    private sendClientHealthReport() {
        const {loadStarted} = XH.appContainerModel.appStateModel;
        const data = {
            session: {
                started: loadStarted,
                durationMins: round((Date.now() - loadStarted) / 60_000, 1)
            },
            modelCount: XH.getModels().length,
            ...getClientDeviceInfo()
        };

        this.clientHealthReportSources.forEach((cb, k) => {
            try {
                data[k] = cb();
            } catch (e) {
                data[k] = `Error: ${e.message}`;
                this.logWarn(`Error running client health report callback for [${k}]`, e);
            }
        });

        const {intervalMins, ...rest} = this.conf.clientHealthReport ?? {};
        this.track({
            category: 'Client Health Report',
            message: 'Submitted report',
            ...rest,
            data
        });
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
        severity: 'DEBUG' | 'INFO' | 'WARN';
    }>;
}
