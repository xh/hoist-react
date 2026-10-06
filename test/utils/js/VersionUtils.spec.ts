/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {checkMinVersion, checkVersion} from '@xh/hoist/utils/js';
import {describe, expect, it} from 'vitest';

/**
 * Version checks that gate startup. EnvironmentService refuses to run against a hoist-core older
 * than `MIN_HOIST_CORE_VERSION`, and `installAgGrid()` / `installHighcharts()` disable those
 * libraries on an unsupported version. Cases use real version strings, including the
 * Maven-style 'X.0-SNAPSHOT' that hoist-core development builds report.
 */
describe('VersionUtils', () => {
    describe('checkMinVersion', () => {
        it.each([
            [true, '42.1.0'],
            [true, '40.5.0'],
            [false, '40.4.2'],
            [true, '43.0-SNAPSHOT'],
            [false, '40.0-SNAPSHOT'],
            [false, null]
        ])('returns %s for hoist-core %s against a 40.5.0 minimum', (expected, version) => {
            expect(!!checkMinVersion(version, '40.5.0')).toBe(expected);
        });
    });

    describe('checkVersion', () => {
        it.each([
            [true, '36.2.0'],
            [true, '36.3.1'],
            [false, '36.1.9'],
            [false, '37.0.0']
        ])('returns %s for ag-Grid %s against a 36.2.0 to 36.*.* range', (expected, version) => {
            expect(!!checkVersion(version, '36.2.0', '36.*.*')).toBe(expected);
        });
    });
});
