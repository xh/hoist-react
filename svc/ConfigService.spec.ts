/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * Soft configs as apps read them via `XH.getConf()` - the most widely used server-backed API in
 * Hoist apps. Pins how missing keys and falsy values resolve against a default, and that the
 * shared config values cannot be changed by any one caller.
 */
describe('ConfigService', () => {
    beforeAll(async () => {
        hoistCore.configs.maxExportRows = 0;
        hoistCore.configs.reportOptions = {formats: ['csv', 'xlsx'], limits: {rows: 5000}};
        await initTestAppAsync();
    });

    describe('get', () => {
        it('returns a falsy value from the server rather than the default', () => {
            expect(XH.getConf('xhEnableImpersonation', true)).toBe(false);
            expect(XH.getConf('maxExportRows', 1000)).toBe(0);
        });

        it('returns the default for a key the server did not send', () => {
            expect(XH.getConf('notOnServer', 5)).toBe(5);
            // null is a valid default - only an omitted default throws.
            expect(XH.getConf('notOnServer', null)).toBeNull();
        });

        it('throws for a missing key with no default', () => {
            expect(() => XH.getConf('notOnServer')).toThrow("Config key not found: 'notOnServer'");
        });

        it('returns values that callers cannot modify', () => {
            // Every caller gets the same object, so one caller's edit would reach all the others.
            const opts = XH.getConf('reportOptions');

            expect(() => (opts.limits.rows = 10)).toThrow(TypeError);
            expect(() => opts.formats.push('pdf')).toThrow(TypeError);
            expect(XH.getConf('reportOptions')).toEqual({
                formats: ['csv', 'xlsx'],
                limits: {rows: 5000}
            });
        });
    });
});
