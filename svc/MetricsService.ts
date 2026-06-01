/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistService, InitContext, XH} from '@xh/hoist/core';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {debounced} from '@xh/hoist/utils/js';
import {isEmpty, isFinite, isString} from 'lodash';

export interface MetricTags {
    [tag: string]: string;
}

interface MetricEntry {
    type: 'timer' | 'count';
    name: string;
    value: number;
    tags?: MetricTags;
}

/**
 * Lightweight client-side metrics service. Records timers and counters by name and optional tags,
 * batching to the server where they are registered with the Micrometer registry on hoist-core.
 *
 * Apps should generally use the {@link Runner} `counter()` / `timer()` builder methods instead of
 * calling this service directly.
 */
export class MetricsService extends HoistService {
    override telemetryPrefix = 'xh.client.metrics';

    static instance: MetricsService;

    /** Max entries to retain when pushes are failing - oldest are dropped beyond this. */
    private static MAX_PENDING = 5000;

    private pending: MetricEntry[] = [];

    override async initAsync(ctx: InitContext) {
        window.addEventListener('beforeunload', () => this.pushPendingAsync());
    }

    /** Record a timer measurement (elapsed millis) for the named metric. */
    recordTimer(name: string, valueMs: number, tags?: MetricTags) {
        this.queue('timer', name, valueMs, tags);
    }

    /** Increment a counter for the named metric (defaults to +1). */
    recordCount(name: string, value: number = 1, tags?: MetricTags) {
        this.queue('count', name, value, tags);
    }

    /**
     * Flush the queue of pending metric entries to the server.
     * @internal - apps should generally allow this service to manage w/its internal debounce.
     */
    async pushPendingAsync() {
        const {pending} = this;
        if (isEmpty(pending)) return;

        this.pending = [];
        try {
            await this.runner()
                .span('push')
                .run(ctx =>
                    XH.postJson(
                        {
                            url: 'xh/recordMetrics',
                            body: {entries: pending},
                            params: {clientUsername: XH.getUsername()}
                        },
                        ctx
                    )
                );
        } catch (e) {
            if (isRetryableError(e)) {
                // Transient failure - re-queue the batch (ahead of newer entries) to retry on the
                // next flush, then bound the buffer in case the outage is prolonged.
                this.pending = [...pending, ...this.pending];
                this.enforceCap();
                this.logError('Failed to push metrics - will retry on next flush', e);
            } else {
                // Permanent (client-side) rejection - drop the batch so it can't deadlock the
                // pipe (e.g. a session mismatch or oversized payload would fail forever).
                this.logError('Server rejected metrics batch - dropping', e);
            }
        }
    }

    //------------------
    // Implementation
    //------------------
    private queue(type: 'timer' | 'count', name: string, value: number, tags?: MetricTags) {
        if (!isString(name) || !name) {
            this.logWarn('Metric name required - skipping', {type, name, value});
            return;
        }
        if (!isFinite(value)) {
            this.logWarn('Metric value must be a finite number - skipping', {type, name, value});
            return;
        }
        const entry: MetricEntry = {type, name, value};
        if (tags && !isEmpty(tags)) entry.tags = tags;
        this.pending.push(entry);
        this.enforceCap();
        this.pushPendingBuffered();
    }

    /** Bound the pending buffer, silently dropping oldest entries (failed pushes are logged). */
    private enforceCap() {
        const {pending} = this,
            {MAX_PENDING} = MetricsService;
        if (pending.length > MAX_PENDING) {
            pending.splice(0, pending.length - MAX_PENDING);
        }
    }

    @debounced(10 * SECONDS)
    private pushPendingBuffered() {
        this.pushPendingAsync();
    }
}

/**
 * Should a failed telemetry push be retried? True for transient failures (network, timeout,
 * 5xx, aborted); false for client-side rejections (4xx) that would fail identically on retry.
 */
function isRetryableError(e: any): boolean {
    return (
        !e?.httpStatus ||
        e.httpStatus >= 500 ||
        e.isTimeout ||
        e.isServerUnavailable ||
        e.isFetchAborted
    );
}
