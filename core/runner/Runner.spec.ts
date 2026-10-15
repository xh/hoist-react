/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type CallContext, HoistModel, LoadSpec, Span, TaskObserver, XH} from '@xh/hoist/core';
import {never, wait} from '@xh/hoist/promise';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * The `runner()` chain, the entry point for spanning, masking and tracking async work. It threads
 * a CallContext through nested calls so their spans join one trace. A dropped or broken context
 * fails silently, as an orphaned span or an activity entry for every auto-refresh.
 */
describe('Runner', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    describe('span', () => {
        it("prefixes the span name with the caller's telemetryPrefix", async () => {
            const model = new PortfolioModel(),
                span = await model
                    .runner()
                    .span('refresh')
                    .run(async ctx => ctx.span);

            expect(span.name).toBe('myApp.portfolio.refresh');
        });

        it('nests the span under the span of the call context', async () => {
            const model = new PortfolioModel();
            let outer: Span, inner: Span;

            await model
                .runner()
                .span('refresh')
                .run(async ctx => {
                    outer = ctx.span;
                    inner = await model
                        .runner(ctx)
                        .span('fetchPositions')
                        .run(async c => c.span);
                });

            expect(outer.parent).toBeNull();
            expect(inner.parent).toBe(outer);
            expect(inner.traceId).toBe(outer.traceId);
        });

        it('nests spans opened by a load under the span that requested the load', async () => {
            const model = new PortfolioModel();
            let outer: Span;

            await model
                .runner()
                .span('refresh')
                .run(ctx => {
                    outer = ctx.span;
                    return model.loadAsync(ctx);
                });

            expect(model.loadCtx.span.parent).toBe(outer);
        });

        it('roots the span under an explicit parent, such as a remote traceparent', async () => {
            const model = new PortfolioModel(),
                traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

            const span = await model
                .runner()
                .span('refresh')
                .run(ctx =>
                    model
                        .runner(ctx)
                        .span({name: 'onMessage', parent: traceparent})
                        .run(async c => c.span)
                );

            expect(span).toMatchObject({
                traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
                parentSpanId: '00f067aa0ba902b7',
                parent: null,
                sampled: true
            });
        });
    });

    describe('run', () => {
        it('passes a load spec that carries the new span and still tracks staleness', async () => {
            // v86 (b6a3f1b9e) - the copy of the LoadSpec made for the span must not read as stale.
            const model = new PortfolioModel();
            model.holdLoads = true;
            model.loadAsync();
            await wait();

            const {loadSpec, span} = model.loadCtx;
            expect(loadSpec.span).toBe(span);
            expect(loadSpec).toMatchObject({loadNumber: 0, isRefresh: false});
            expect(loadSpec.isStale).toBe(false);

            model.refreshAsync();
            expect(loadSpec.isStale).toBe(true);
        });

        it('marks a linked observer pending until the work settles', async () => {
            const model = new PortfolioModel(),
                observer = TaskObserver.trackLast();
            let finish: () => void;

            const run = model
                .runner()
                .span('save')
                .linkTo(observer)
                .run(() => new Promise<void>(resolve => (finish = resolve)));
            expect(observer.isPending).toBe(true);

            finish();
            await run;
            expect(observer.isPending).toBe(false);
        });

        it('tracks activity on completion, but not for an auto-refresh', async () => {
            const model = new TrackedModel();

            await model.loadAsync();
            await model.autoRefreshAsync();
            await XH.trackService.pushPendingAsync();

            const [request] = hoistCore.requestsTo('xh/track');
            expect(request.json.entries.map(it => it.msg)).toEqual(['Loaded portfolio']);
        });
    });
});

//------------------
// Helpers
//------------------
class PortfolioModel extends HoistModel {
    override telemetryPrefix = 'myApp.portfolio';

    /** Context passed to the run function of the latest load. */
    loadCtx: CallContext;

    /** True to leave loads pending, for tests that inspect a load in flight. */
    holdLoads = false;

    override async doLoadAsync(loadSpec: LoadSpec) {
        await this.runner({loadSpec})
            .span('load')
            .run(async ctx => {
                this.loadCtx = ctx;
                if (this.holdLoads) await never();
            });
    }
}

class TrackedModel extends HoistModel {
    override async doLoadAsync(loadSpec: LoadSpec) {
        await this.runner({loadSpec})
            .span('load')
            .track('Loaded portfolio')
            .run(async () => {});
    }
}
