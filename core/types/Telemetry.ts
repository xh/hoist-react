/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Span} from '../Span';
import {LoadSpec, LoadSpecConfig} from '../load';
import {NameSource} from '@xh/hoist/utils/js';
import {PlainObject, Thunkable} from './Types';

//------------------------
// Call Context
//------------------------
/**
 * Tracing and load state to be carried across call boundaries.
 *
 * Either field may be set independently or together. Pass as an object literal (e.g. `{loadSpec}`)
 * to any framework method that accepts a call context.
 */
export interface CallContextLike {
    /** Tracing span for the current call, used to correlate logs and timing across boundaries. */
    span?: Span;

    /** LoadSpec describing the triggering load, when this call originates from a load operation. */
    loadSpec?: LoadSpec;
}

/**
 * Context passed to `HoistService.initAsync()` and `HoistAppModel.initAsync()`, and forwarded
 * via `XH.installServicesAsync()` to nest service-init activity under the current phase.
 *
 * Apps should pass `ctx` through unchanged to `XH.installServicesAsync()` calls, and use
 * `ctx.span` as the `parent` for any new spans created during init.
 */
export interface InitContext {
    /** Root span for the current init phase (e.g. `xh.client.hoistInit`, `xh.client.appInit`). */
    span: Span;
}

//------------------------
// Tracing
//------------------------
export type SpanKind = 'internal' | 'client' | 'server' | 'producer' | 'consumer';

/**
 * Configuration for a {@link Span} - a lightweight trace span for distributed tracing.
 *
 * See {@link Runner} for more information on how to instrument code with tracing context.
 */
export interface SpanConfig {
    /** Span name - typically a short, dotted identifier (e.g. `app.userAction`). */
    name: string;

    /** OTel span kind. Defaults to `internal`. */
    kind?: SpanKind;

    /** Tags attached to the span as key/value attributes. */
    tags?: PlainObject;

    /**
     * Parent under which to root this span:
     * - a live {@link Span} for explicit in-process nesting (usually unnecessary - threading the
     *   call context via `runner(ctx)` nests child spans automatically), or
     * - a W3C `traceparent` string to chain onto a trace received off-channel - e.g. a
     *   WebSocket / SSE / queue message carrying an upstream `traceparent`.
     *
     * Malformed traceparents are ignored and the span becomes a root. Omit to nest under the
     * call-context span, if any.
     */
    parent?: Span | string;
}

/**
 * The complete span-construction config consumed by the low-level {@link Span} constructor and
 * {@link TraceService.withSpan}. Extends the app-facing {@link SpanConfig} with fields that
 * the {@link Runner} layer populates on the application's behalf rather than apps supplying them.
 *
 * Apps do not construct this directly - instrument via `runner().span()`, which assembles it from
 * a plain {@link SpanConfig} plus the active call context.
 *
 * @internal
 */
export interface FullSpanConfig extends SpanConfig {
    /**
     * Override the span's start time (epoch ms). Use when the work being traced began before
     * the span was constructed - e.g. timing an event whose timestamp is known.
     */
    startTime?: number;

    /** Source for the `code.namespace` tag - usually the calling object/function. */
    caller?: NameSource;
}

//------------------------
// Metrics
//------------------------
/** Key/value tags attached to a metric recorded via {@link MetricsService}. */
export interface MetricTags {
    [tag: string]: string;
}

//------------------------
// Activity Tracking
//------------------------
/**
 * Severity levels for tracking.  Default is 'INFO'.
 */
export type TrackSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Options for tracking activity on the server via TrackService.
 */
export interface TrackOptions {
    /** Short description of the activity being tracked. */
    message: string;

    /** App-supplied category.*/
    category?: string;

    /** Correlation ID to save along with track log. */
    correlationId?: string;

    /** App-supplied data to save along with track log.*/
    data?: PlainObject | Array<unknown>;

    /**
     * Set true to log on the server all primitive values in the 'data' property.
     * May also be specified as list of specific property keys that should be logged.
     *
     * Default value for this property may be set in xhActivityTrackingConfig.
     * If no default set, value will be `false` and nothing in data will be logged.
     */
    logData?: boolean | string[];

    /**
     * Flag to indicate relative importance of activity. Default 'INFO'.
     *
     * Allows conditional saving of messages depending on the currently active
     * level configuration for the category/user.  See HoistCore's 'TrackService' for
     * more information.
     *
     * Note, errors should be tracked via {@link XH.handleException}, which
     * will post to the server for dedicated logging if requested.
     */
    severity?: TrackSeverity;

    /**
     * Set to true to log this message only once during the current session. The category and
     * message text will be used as a compound key to identify repeated messages.
     */
    oncePerSession?: boolean;

    /** Optional LoadSpec associated with this track.*/
    loadSpec?: LoadSpec | LoadSpecConfig;

    /** Timestamp for action. */
    timestamp?: number;

    /** Elapsed time (ms) for action. */
    elapsed?: number;

    /** Optional flag to omit sending message. */
    omit?: Thunkable<boolean>;
}
