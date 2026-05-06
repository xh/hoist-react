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
    override spanPrefix = 'xh.client.metrics';

    static instance: MetricsService;

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

        await this.rootSpan('push').run(async ctx => {
            this.pending = [];
            await ctx.postJson({
                url: 'xh/recordMetrics',
                body: {entries: pending},
                params: {clientUsername: XH.getUsername()}
            });
        });
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
        this.pushPendingBuffered();
    }

    @debounced(10 * SECONDS)
    private pushPendingBuffered() {
        this.pushPendingAsync();
    }
}
