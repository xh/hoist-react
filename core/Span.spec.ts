/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {formatTraceparent, parseTraceparent, Span} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {describe, expect, it} from 'vitest';

/**
 * Trace spans: the W3C `traceparent` header that links client and server traces, and the trace id
 * stamped onto errors, which exception dialogs show so support can find the trace.
 */
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736',
    SPAN_ID = '00f067aa0ba902b7';

describe('parseTraceparent', () => {
    it('reads the trace id, parent span id and sampled flag', () => {
        expect(parseTraceparent(`00-${TRACE_ID}-${SPAN_ID}-01`)).toEqual({
            traceId: TRACE_ID,
            spanId: SPAN_ID,
            sampled: true
        });
        expect(parseTraceparent(`00-${TRACE_ID}-${SPAN_ID}-00`).sampled).toBe(false);
        // Trace Context Level 2 adds a random-id flag (0x02), so sampling is a bit test.
        expect(parseTraceparent(`00-${TRACE_ID}-${SPAN_ID}-03`).sampled).toBe(true);
    });

    it.each([
        ['an invalid version', `ff-${TRACE_ID}-${SPAN_ID}-01`],
        ['an all-zero trace id', `00-${'0'.repeat(32)}-${SPAN_ID}-01`],
        ['an all-zero span id', `00-${TRACE_ID}-${'0'.repeat(16)}-01`],
        ['uppercase hex', `00-${TRACE_ID.toUpperCase()}-${SPAN_ID}-01`],
        ['a missing field', `00-${TRACE_ID}-${SPAN_ID}`]
    ])('rejects %s', (_, value) => {
        expect(parseTraceparent(value)).toBeNull();
    });
});

describe('formatTraceparent', () => {
    it('sets the sampled flag only for a trace known to be sampled', () => {
        // An undecided trace goes out unsampled, so the server does not sample it on its own.
        expect(formatTraceparent(TRACE_ID, SPAN_ID, true)).toBe(`00-${TRACE_ID}-${SPAN_ID}-01`);
        expect(formatTraceparent(TRACE_ID, SPAN_ID, false)).toBe(`00-${TRACE_ID}-${SPAN_ID}-00`);
        expect(formatTraceparent(TRACE_ID, SPAN_ID, null)).toBe(`00-${TRACE_ID}-${SPAN_ID}-00`);
    });
});

describe('Span', () => {
    describe('recordException', () => {
        it('stamps the trace id onto the error and marks the span failed', () => {
            const span = newSpan(true),
                error = new Error('Query failed');

            span.recordException(error);

            expect(error['traceId']).toBe(span.traceId);
            expect(span.status).toBe('error');
            expect(span.statusDescription).toBe('Query failed');
        });

        it('does not stamp an error from an unsampled trace', () => {
            // v85 (d344b3a85) - users were shown a trace id that was never exported.
            const span = newSpan(false),
                error = new Error('Query failed');

            span.recordException(error);

            expect(error['traceId']).toBeUndefined();
            expect(span.status).toBe('error');
        });

        it('does not mark the span failed for a routine exception', () => {
            // v85 (610f65cc3) - an exception event would read as an error in trace backends.
            const span = newSpan(true),
                error = Exception.create({message: 'Session expired', isRoutine: true});

            span.recordException(error);

            expect(span.status).toBe('unset');
            expect(span.events).toEqual([]);
        });
    });
});

//------------------
// Helpers
//------------------
function newSpan(sampled: boolean): Span {
    const ret = new Span({name: 'loadPositions', tags: {}});
    ret.sampled = sampled;
    return ret;
}
