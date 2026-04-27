/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {isHoistException} from '@xh/hoist/exception';
import {NameSource} from '@xh/hoist/utils/js';

/**
 * Lightweight client-side span representation for distributed tracing.
 *
 * Produces W3C-compatible trace and span IDs without requiring the full
 * OpenTelemetry SDK. Completed spans are exported to the Hoist server,
 * which relays them to the configured collector.
 *
 * @internal
 */
export class Span {
    /** 32 hex chars (128-bit). */
    traceId: string;

    /** 16 hex chars (64-bit). */
    spanId: string;

    /** Parent span, or null for root spans. */
    parent: Span;

    name: string;

    /** Epoch ms (Date.now()-based). */
    startTime: number;

    /** Epoch ms - set when span ends. */
    endTime: number;

    /** Duration in ms (endTime - startTime). */
    get duration(): number {
        return this.endTime - this.startTime;
    }

    kind: SpanKind;
    status: SpanStatus = 'unset';
    statusDescription: string;
    tags: PlainObject;
    events: SpanEvent[] = [];

    /**
     * Tri-state sampling decision:
     * - `true`: span is sampled and will be exported.
     * - `false`: span is not sampled and will be dropped.
     * - `null`: decision deferred (e.g. created before {@link TraceService} sampling config is
     *   loaded). Resolved later by {@link TraceService}; outbound `traceparent` headers send `00`
     *   while undecided so server-side spans don't sample without a client decision.
     */
    sampled: boolean | null;

    constructor(config: SpanConfig) {
        const {parent} = config;
        this.parent = config.parent;
        this.spanId = genSpanId();
        this.name = config.name;
        this.kind = config.kind ?? 'internal';
        this.startTime = config.startTime ?? Date.now();
        this.tags = config.tags;
        this.traceId = parent?.traceId ?? genTraceId();
        this.sampled = config.sampled ?? parent?.sampled ?? null;
    }

    /** End this span, computing duration. */
    end() {
        this.endTime = Date.now();
    }

    /** Set a single tag on this span. */
    setTag(key: string, value: any) {
        this.tags[key] = value;
    }

    /** Merge the given tags onto this span. */
    setTags(tags: PlainObject) {
        Object.assign(this.tags, tags);
    }

    /**
     * Set the HTTP response status code tag and mark the span as 'error' when appropriate per
     * OTel HTTP semantic conventions: client spans error on status >= 400, server spans on >= 500.
     */
    setHttpStatus(statusCode: number) {
        this.setTag('http.response.status_code', statusCode);
        const errorThreshold = this.kind === 'client' ? 400 : 500;
        if (statusCode >= errorThreshold) this.setError();
    }

    /**
     * Record an exception event on this span, stamp traceId onto the error if not already set,
     * and mark the span as 'error' (with the exception message as description) unless an error
     * status has already been set (e.g. via {@link setHttpStatus}).
     *
     * Skips routine HoistExceptions entirely - Datadog's OTLP intake maps any exception event
     * onto error.* tags, which would mask the routine nature of the failure.
     */
    recordException(error: unknown) {
        if (error && !error['traceId']) error['traceId'] = this.traceId;
        if (isHoistException(error) && error.isRoutine) return;
        const message = error instanceof Error ? error.message : String(error);
        this.events.push({
            name: 'exception',
            timestamp: Date.now(),
            attributes: {message}
        });
        this.setError(message);
    }

    /** Mark the span status as 'error', with an optional description. */
    private setError(description?: string) {
        this.status = 'error';
        if (description) this.statusDescription = description;
    }

    /** Serialize for export to the server. */
    toJSON(): PlainObject {
        return {
            traceId: this.traceId,
            spanId: this.spanId,
            parentSpanId: this.parent?.spanId ?? null,
            name: this.name,
            kind: this.kind,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.duration,
            status: this.status,
            statusDescription: this.statusDescription,
            tags: this.tags,
            events: this.events,
            sampled: this.sampled
        };
    }
}

/**
 * Configuration for a {@link Span} - a lightweight trace span for distributed tracing.
 * Create via {@link TraceService} rather than directly.
 *
 * @see Span
 * @see TraceService
 */
export interface SpanConfig {
    name: string;
    kind?: SpanKind;
    tags?: PlainObject;
    parent?: Span;
    startTime?: number;
    caller?: NameSource;
    sampled?: boolean;
}

export interface SpanEvent {
    name: string;
    timestamp: number;
    attributes?: PlainObject;
}

export type SpanKind = 'internal' | 'client' | 'server' | 'producer' | 'consumer';
export type SpanStatus = 'ok' | 'error' | 'unset';

/**
 * Format a W3C traceparent header value. An undecided sampling state (`null`) is sent as `00`
 * (not sampled) so the server doesn't make its own sampling decision in the absence of a client
 * one - those server-side spans would be unparented from the client's perspective.
 * @see https://www.w3.org/TR/trace-context/#traceparent-header
 */
export function formatTraceparent(
    traceId: string,
    spanId: string,
    sampled: boolean | null = true
): string {
    return `00-${traceId}-${spanId}-${sampled === true ? '01' : '00'}`;
}

/** Generate a 32-hex-char (128-bit) trace ID. */
export function genTraceId(): string {
    return genHexId(16);
}

/** Generate a 16-hex-char (64-bit) span ID. */
export function genSpanId(): string {
    return genHexId(8);
}

//------------------
// Implementation
//------------------
function genHexId(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}
