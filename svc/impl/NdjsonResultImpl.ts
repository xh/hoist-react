/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {noop} from 'lodash';
import type {FetchException, NdjsonFetchOptions, NdjsonResult} from '../FetchService';
import {StringInterner} from './StringInterner';

/**
 * Decodes a streamed NDJSON Response body into chunks of parsed records - implementation helper
 * for {@link FetchService.fetchNdjson}, which remains the public entry point and injects all
 * service-level concerns via constructor arguments. Implements {@link NdjsonResult} and is
 * returned to callers directly.
 *
 * @internal
 */
export class NdjsonResultImpl implements NdjsonResult {
    /** Marker written by hoist-core's `renderNdjson` when a stream fails after committing. */
    private static readonly POISON = '//xh-ndjson-stream-error';

    /** Parsed data records - see {@link NdjsonResult.lines}. */
    readonly lines: AsyncGenerator<PlainObject[]>;

    /** Leading metadata record - see {@link NdjsonResult.meta}. */
    readonly meta: Promise<PlainObject> | null = null;

    /**
     * Settles when streaming has finished - resolving after complete consumption or early
     * termination by the consumer, rejecting on a streaming-phase failure. Request-phase
     * failures are not reported here - see {@link whenCompleteAsync}, which covers both phases.
     */
    private completion: Promise<void>;

    private onComplete: (err?: unknown) => void;

    constructor(
        private response: Promise<Response>,
        opts: NdjsonFetchOptions,
        private interner: StringInterner,
        private enrichError: (cause: any, response: Response) => FetchException
    ) {
        this.completion = new Promise<void>(
            (res, rej) => (this.onComplete = err => (err ? rej(err) : res()))
        );

        const stream = this.stream();
        if (opts.firstLineIsMeta) {
            // Eagerly read through the first record so `meta` resolves without requiring
            // `lines` to be consumed - callers typically need it up-front to decide how to
            // process the balance of the stream.
            const first = stream.next();
            this.meta = first.then(({done, value}) => (done ? null : value[0]));

            // Mark any rejection as observed - avoids unhandled-rejection noise
            this.meta.catch(noop);

            this.lines = this.linesAfterMeta(first, stream);
        } else {
            this.lines = stream;
        }
    }

    /**
     * Resolves once the request has completed and its stream has been fully consumed (or the
     * consumer exited early) - rejects on a failure in either phase. Use to track the full
     * lifetime of the stream, e.g. for spanning and telemetry.
     */
    async whenCompleteAsync(): Promise<void> {
        await this.response;
        await this.completion;
    }

    //-----------------------
    // Implementation
    //-----------------------
    /**
     * Await the pending request, then stream its body - wrapping any failure raised while
     * reading or parsing the stream via the configured `enrichError`.
     *
     * Settles `completion` on exit - see that property for its exact semantics.
     */
    private async *stream(): AsyncGenerator<PlainObject[]> {
        const {interner, enrichError, onComplete} = this;
        try {
            const response = await this.response;
            try {
                yield* this.chunks(response);
                interner?.commit();
            } catch (e) {
                const ex = enrichError(e, response);
                onComplete(ex);
                throw ex;
            }
        } finally {
            // Only finally blocks run if the consumer exits its loop early. Discard any
            // uncommitted interned values - no-op after a successful commit above.
            interner?.abort();
            onComplete();
        }
    }

    /**
     * Read an NDJSON Response body incrementally, yielding chunks (arrays) of parsed records as
     * they arrive off the network. Each line is parsed with native JSON.parse, partial trailing
     * lines are carried across chunk boundaries, and no more than one network chunk of raw text
     * is buffered.
     *
     * Note the final-buffer parse below doubles as truncation detection - a stream cut short by
     * a server-side failure ends with an unparseable line (see fetchNdjson) and throws here.
     */
    private async *chunks(response: Response): AsyncGenerator<PlainObject[]> {
        const {interner} = this,
            reader = response.body.getReader(),
            decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const {done, value} = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n');
            buffer = lines.pop(); // retain any partial trailing line for the next chunk
            const chunk = lines.filter(Boolean).map(it => JSON.parse(it));
            if (chunk.length) {
                interner?.intern(chunk);
                yield chunk;
            }
        }

        buffer += decoder.decode();
        if (buffer.trim()) {
            if (buffer.trim() === NdjsonResultImpl.POISON) {
                throw Exception.create({
                    name: 'NDJSON Stream Error',
                    message: 'NDJSON stream terminated by a server-side failure - see server logs.'
                });
            }
            const chunk = [JSON.parse(buffer)];
            interner?.intern(chunk);
            yield chunk;
        }
    }

    /**
     * Yield the balance of the eagerly-read first chunk, then delegate to the remaining stream.
     */
    private async *linesAfterMeta(
        first: Promise<IteratorResult<PlainObject[]>>,
        stream: AsyncGenerator<PlainObject[]>
    ): AsyncGenerator<PlainObject[]> {
        try {
            const {done, value} = await first; // rethrows any failure hit reading the meta record
            if (!done) {
                if (value.length > 1) yield value.slice(1);
                yield* stream;
            }
        } finally {
            await stream.return(null); // ensure inner cleanup if the consumer exits early
        }
    }
}
