/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {NameSource} from '@xh/hoist/utils/js';

/**
 * Lightweight client-side span representation for distributed tracing.
 *
 * Produces W3C-compatible trace and span IDs without requiring the full
 * OpenTelemetry SDK. Completed spans are exported to the Hoist server,
 * which relays them to the configured collector.
 */
export class Span {
    /** 32 hex chars (128-bit). */
    traceId: string;

    /** 16 hex chars (64-bit). */
    spanId: string;

    /** 16 hex chars, or null for root spans. */
    parentSpanId: string;

    name: string;

    /** Epoch ms (Date.now()-based). */
    startTime: number;

    /** Epoch ms — set when span ends. */
    endTime: number;

    /** Duration in ms (endTime - startTime). */
    get duration(): number {
        return this.endTime - this.startTime;
    }

    kind: SpanKind;
    status: SpanStatus = 'unset';
    tags: PlainObject;
    events: SpanEvent[] = [];

    constructor(config: SpanConfig) {
        const parent = config.parent;
        this.traceId = parent?.traceId ?? genTraceId();
        this.spanId = genSpanId();
        this.parentSpanId = parent?.spanId ?? null;
        this.name = config.name;
        this.kind = config.kind ?? 'internal';
        this.startTime = config.startTime ?? Date.now();
        this.tags = {...config.tags};
    }

    /** End this span, recording status and computing duration. */
    end(status: SpanStatus = 'ok') {
        this.endTime = Date.now();
        this.status = status;
    }

    /** Record an error event on this span. */
    recordError(error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.events.push({
            name: 'exception',
            timestamp: Date.now(),
            attributes: {message}
        });
    }

    /** Serialize for export to the server. */
    toJSON(): PlainObject {
        return {
            traceId: this.traceId,
            spanId: this.spanId,
            parentSpanId: this.parentSpanId,
            name: this.name,
            kind: this.kind,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.duration,
            status: this.status,
            tags: this.tags,
            events: this.events
        };
    }
}

export interface SpanConfig {
    name: string;
    kind?: SpanKind;
    tags?: PlainObject;
    parent?: Span;
    startTime?: number;
    caller?: NameSource;
}

export interface SpanEvent {
    name: string;
    timestamp: number;
    attributes?: PlainObject;
}

export type SpanKind = 'internal' | 'client' | 'server' | 'producer' | 'consumer';
export type SpanStatus = 'ok' | 'error' | 'unset';

/**
 * Format a W3C traceparent header value.
 * @see https://www.w3.org/TR/trace-context/#traceparent-header
 */
export function formatTraceparent(traceId: string, spanId: string): string {
    return `00-${traceId}-${spanId}-01`;
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
