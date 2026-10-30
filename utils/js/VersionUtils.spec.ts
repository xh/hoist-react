/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {checkMaxVersion, checkMinVersion, checkVersion} from '@xh/hoist/utils/js';
import {describe, expect, it} from 'vitest';

/**
 * Version checks that gate startup. EnvironmentService refuses to run against a hoist-core older
 * than `MIN_HOIST_CORE_VERSION`, and `installAgGrid()` / `installHighcharts()` disable those
 * libraries on an unsupported version. Cases use real version strings, including the
 * Maven-style 'X.0-SNAPSHOT' that hoist-core development builds report.
 *
 * Expected values were recorded from semver 7's `satisfies(v, '>=min', {includePrerelease: true})`
 * and `satisfies(v, '<=max', ...)`, which these checks replaced, so they pin that behavior.
 */
describe('VersionUtils', () => {
    describe('checkMinVersion', () => {
        it.each([
            [true, '42.1.0'],
            [true, '40.5.0'],
            [false, '40.4.2'],
            [true, '43.0-SNAPSHOT'],
            [false, '40.0-SNAPSHOT'],
            [false, '40.5.0-SNAPSHOT'],
            [true, '40.5.1-SNAPSHOT'],
            [true, '40.10.0'],
            [true, '140.0.0'],
            [true, 'v40.5.0'],
            [true, '40.5.0+build.7'],
            [true, ' 40.5.0 '],
            [false, null]
        ])('returns %s for hoist-core %s against a 40.5.0 minimum', (expected, version) => {
            expect(!!checkMinVersion(version, '40.5.0')).toBe(expected);
        });

        it.each(['40.5', '40', '40.5.0.1', '040.5.0', 'abc', ''])(
            'rejects the unparseable version %s',
            version => {
                expect(!!checkMinVersion(version, '1.0.0')).toBe(false);
            }
        );

        it.each([
            [true, '40.5.0', '40.5'],
            [true, '40.9.0', '40'],
            [true, '40.5.0', '40.5.0-SNAPSHOT'],
            [true, '40.5.0-SNAPSHOT', '40.5.0-SNAPSHOT'],
            [false, '40.9.0', '40.10.0'],
            [false, '40.5.0', null]
        ])('returns %s for %s against a %s minimum', (expected, version, min) => {
            expect(!!checkMinVersion(version, min)).toBe(expected);
        });

        it.each([
            [false, '40.5.0-rc.2', '40.5.0-rc.10'],
            [true, '40.5.0-rc.10', '40.5.0-rc.2'],
            [true, '40.5.0-beta', '40.5.0-alpha'],
            [false, '40.5.0-alpha', '40.5.0-beta'],
            [true, '40.5.0-rc.1', '40.5.0-beta.9'],
            [false, '40.5.0-1', '40.5.0-alpha']
        ])('orders prereleases by semver precedence: %s for %s against %s', (expected, v, min) => {
            expect(checkMinVersion(v, min)).toBe(expected);
        });
    });

    describe('checkMaxVersion', () => {
        it.each([
            [true, '36.2.0', '36.*.*'],
            [true, '36.99.99', '36.*.*'],
            [false, '37.0.0', '36.*.*'],
            [false, '37.0.0-beta.1', '36.*.*'],
            [true, '36.2.0', '36.x'],
            [true, '36.2.0', '36'],
            [true, '36.2.0', '*'],
            [true, '36.2.5', '36.2.*'],
            [false, '36.3.0', '36.2.*'],
            [true, '12.0-SNAPSHOT', '12.*.*'],
            [true, '36.2.0', '36.2.0'],
            [false, '36.2.1', '36.2.0'],
            [true, '36.2.0-rc.1', '36.2.0']
        ])('returns %s for %s against a %s maximum', (expected, version, max) => {
            expect(!!checkMaxVersion(version, max)).toBe(expected);
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
