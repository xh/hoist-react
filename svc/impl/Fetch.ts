/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {CallContextLike, XH} from '@xh/hoist/core';
import type {FetchOptions} from '../FetchService';

/**
 * Post a JSON body, using `fetch({keepalive: true})` when the page is no longer visible so the
 * request can survive teardown (e.g. a flush as `XH.pageState` goes `hidden`/`frozen`/`terminated`).
 *
 * Keepalive bodies share a single browser-wide 64KB budget; if exceeded the request is never sent
 * and we retry once uncapped (without keepalive), which still completes while the page is alive (the
 * common `hidden` case). Real server errors are re-thrown, not re-posted.
 *
 * @internal
 */
export async function terminationSafePostJson(
    opts: FetchOptions,
    ctx?: CallContextLike
): Promise<any> {
    if (XH.pageIsVisible) return XH.postJson(opts, ctx);

    try {
        return await XH.postJson({...opts, fetchOpts: {...opts.fetchOpts, keepalive: true}}, ctx);
    } catch (e: any) {
        // Retry uncapped if keepalive was never sent (over-budget); re-throw real server errors.
        if (e.isServerUnavailable) return XH.postJson(opts, ctx);
        throw e;
    }
}
