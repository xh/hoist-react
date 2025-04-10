/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistService, PageState, PlainObject, TrackOptions, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES} from '@xh/hoist/utils/datetime';
import {withFormattedTimestamps} from '@xh/hoist/format';
import {pick, round} from 'lodash';

/**
 * Service for gathering data about the current state and health of the client app, for submission
 * to the server or review on the console during interactive troubleshooting.
 *
 * Hoist sends this data once on application load and can be configured to send at regular intervals
 * throughout a user's session via the `xhActivityTracking.clientHealthReport` app config. Reports
 * are submitted via activity tracking for review within the Admin Console.
 */
export class ClientHealthService extends HoistService {
    static instance: ClientHealthService;

    private sources: Map<string, () => any> = new Map();

    override async initAsync() {
        const {clientHealthReport} = XH.trackService.conf;
        Timer.create({
            runFn: () => this.sendReportInternal(),
            interval: clientHealthReport.intervalMins * MINUTES,
            delay: true
        });
    }

    get enabled(): boolean {
        return XH.trackService.enabled;
    }

    /** @returns a customizable report with metrics capturing client app/session state. */
    getReport(): ClientHealthReport {
        return {
            general: this.getGeneral(),
            memory: this.getMemory(),
            connection: this.getConnection(),
            ...this.getCustom()
        };
    }

    /** @returns a report, formatted for easier viewing in console. **/
    getFormattedReport(): PlainObject {
        return withFormattedTimestamps(this.getReport());
    }

    /**
     * Register a new source for app-specific data to be sent with each report.
     * @param key - key under which to report the data - can be used to remove this source later.
     * @param callback - function returning serializable to include with each report.
     */
    addSource(key: string, callback: () => any) {
        this.sources.set(key, callback);
    }

    /** Unregister a previously-enabled source for client health report data. */
    removeSource(key: string) {
        this.sources.delete(key);
    }

    /**
     * Generate and submit a report to the server, via TrackService.
     *
     * For ad-hoc troubleshooting. Apps may also configure this service to
     * submit on regular intervals.
     */
    async sendReportAsync() {
        this.sendReportInternal({severity: 'INFO'});
        await XH.trackService.pushPendingAsync();
    }

    // -----------------------------------
    // Generate individual report sections
    //------------------------------------
    getGeneral(): GeneralData {
        const startTime = XH.appContainerModel.appStateModel.loadStarted,
            elapsedMins = (ts: number) => round((Date.now() - ts) / 60_000, 1);

        return {
            startTime,
            durationMins: elapsedMins(startTime),
            idleMins: elapsedMins(XH.lastActivityMs),
            pageState: XH.pageState,
            webSocket: XH.webSocketService.channelKey
        };
    }

    getConnection(): ConnectionData {
        const nav = window.navigator as any;
        if (!nav.connection) return null;
        return pick(nav.connection, ['downlink', 'effectiveType', 'rtt']);
    }

    getMemory(): MemoryData {
        const perf = window.performance as any;
        if (!perf?.memory) return null;

        const ret: MemoryData = {modelCount: XH.getModels().length};
        ['jsHeapSizeLimit', 'totalJSHeapSize', 'usedJSHeapSize'].forEach(key => {
            const raw = perf.memory[key];
            if (raw) ret[key] = round(raw / 1024 / 1024); // convert to MB
        });

        const {jsHeapSizeLimit: limit, usedJSHeapSize: used} = ret;
        if (limit && used) {
            ret.usedPctLimit = round((used / limit) * 100);
        }

        return ret;
    }

    getCustom(): PlainObject {
        const ret = {};
        this.sources.forEach((cb, k) => {
            try {
                ret[k] = cb();
            } catch (e) {
                ret[k] = `Error: ${e.message}`;
                this.logWarn(`Error running client health report callback for [${k}]`, e);
            }
        });
        return ret;
    }

    //---------------------
    // Implementation
    //---------------------
    private sendReportInternal(opts: Partial<TrackOptions> = {}) {
        const {intervalMins, ...rest} = XH.trackService.conf.clientHealthReport ?? {};

        XH.track({
            category: 'App',
            message: 'Submitted health report',
            ...rest,
            ...opts,
            data: {
                clientId: XH.clientId,
                sessionId: XH.sessionId,
                ...this.getReport()
            }
        });
    }
}

export interface GeneralData {
    startTime: number;
    durationMins: number;
    idleMins: number;
    pageState: PageState;
    webSocket: string;
}

export interface ConnectionData {
    downlink: number;
    effectiveType: string;
    rtt: number;
}

export interface MemoryData {
    modelCount: number;
    usedPctLimit?: number;
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
}

export interface ClientHealthReport {
    general: GeneralData;
    connection: ConnectionData;
    memory: MemoryData;
}
