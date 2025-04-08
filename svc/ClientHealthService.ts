/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistService, PlainObject, XH} from '@xh/hoist/core';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES} from '@xh/hoist/utils/datetime';
import {find, isPlainObject, pick, round} from 'lodash';

/**
 * Service for gathering data about client health.
 *
 * Hoist sends this data once on application load, and can be configured to send
 * it at regularly scheduled intervals.  Configure via soft-config property
 * 'xhActivityTracking.clientHealthReport'.
 */
export class ClientHealthService extends HoistService {
    static instance: ClientHealthService;

    private sources: Map<string, () => any> = new Map();

    override async initAsync() {
        const {clientHealthReport} = XH.trackService.conf;
        Timer.create({
            runFn: () => this.sendReport(),
            interval: clientHealthReport.intervalMins * MINUTES
        });
    }

    /**
     * Main Entry report.  Return a default report of client health.
     */
    getReport(): ClientHealthReport {
        return {
            session: this.getSession(),
            ...this.getCustom(),
            memory: this.getMemory(),
            connection: this.getConnection(),
            window: this.getWindow(),
            screen: this.getScreen()
        };
    }

    /**
     * Register a new source for client health report data. No-op if background health report is
     * not generally enabled via `xhActivityTrackingConfig.clientHealthReport.intervalMins`.
     *
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

    // -----------------------------------
    // Generate individual report sections
    //------------------------------------
    getSession(): SessionData {
        const {loadStarted} = XH.appContainerModel.appStateModel;
        return {
            startTime: loadStarted,
            durationMins: round((Date.now() - loadStarted) / 60_000, 1)
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
            ret.usedPctLimit = round((used / limit) * 100, 1);
        }

        return ret;
    }

    getScreen(): ScreenData {
        const screen = window.screen as any;
        if (!screen) return null;

        const ret: ScreenData = pick(screen, [
            'availWidth',
            'availHeight',
            'width',
            'height',
            'colorDepth',
            'pixelDepth',
            'availLeft',
            'availTop'
        ]);
        if (screen.orientation) {
            ret.orientation = pick(screen.orientation, ['angle', 'type']);
        }
        return ret;
    }

    getWindow(): WindowData {
        return pick(window, [
            'devicePixelRatio',
            'screenX',
            'screenY',
            'innerWidth',
            'innerHeight',
            'outerWidth',
            'outerHeight'
        ]);
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

    //------------------
    // Implementation
    //------------------
    private sendReport() {
        const {
            intervalMins,
            severity: defaultSeverity,
            ...rest
        } = XH.trackService.conf.clientHealthReport ?? {};

        const rpt = this.getReport();
        let severity = defaultSeverity ?? 'INFO';
        if (find(rpt, (v: any) => isPlainObject(v) && v.severity === 'WARN')) {
            severity = 'WARN';
        }

        XH.track({
            category: 'App',
            message: 'Submitted health report',
            severity,
            ...rest,
            data: rpt
        });
    }
}

export interface SessionData {
    startTime: number;
    durationMins: number;
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

export interface WindowData {
    devicePixelRatio: number;
    screenX: number;
    screenY: number;
    innerWidth: number;
    innerHeight: number;
    outerWidth: number;
    outerHeight: number;
}

export interface ScreenData {
    availWidth: number;
    availHeight: number;
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
    availLeft: number;
    availTop: number;
    orientation?: {
        angle: number;
        type: string;
    };
}

export interface ClientHealthReport {
    session: SessionData;
    connection: ConnectionData;
    memory: MemoryData;
    window: WindowData;
    screen: ScreenData;
}
