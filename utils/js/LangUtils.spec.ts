/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, HoistService} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {mergeDeep, parseNameSource, pluralize, throwIf, withDefault} from '@xh/hoist/utils/js';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * Core language helpers. `withDefault` and `throwIf` sit in hundreds of config-parsing paths, and
 * `mergeDeep` layers the Chart, TreeMap, Box and auth client configs. A small change in their
 * semantics would silently change behavior across every app.
 */
describe('LangUtils', () => {
    describe('withDefault', () => {
        it('skips only undefined values, treating null, false and 0 as set', () => {
            // Apps pass null to clear a default - e.g. `headerName: null` for a Column with no label.
            expect(withDefault(undefined, null, 'Description')).toBeNull();
            expect(withDefault<boolean>(undefined, false, true)).toBe(false);
            expect(withDefault(0, 10)).toBe(0);
            expect(withDefault(undefined, undefined)).toBeUndefined();
        });
    });

    describe('throwIf', () => {
        it('throws a HoistException with the message only when the condition is truthy', () => {
            expect(() => throwIf(0, 'Store required')).not.toThrow();
            expect(() => throwIf(null, 'Store required')).not.toThrow();

            try {
                throwIf('yes', 'Store required');
                expect.unreachable();
            } catch (e) {
                expect(e.message).toBe('Store required');
                expect(e.isHoistException).toBe(true);
            }
        });

        it('throws a provided exception as-is', () => {
            const ex = Exception.create({message: 'Server too old', isRoutine: true});
            try {
                throwIf(true, ex);
                expect.unreachable();
            } catch (e) {
                expect(e).toBe(ex);
                expect(e.isRoutine).toBe(true);
            }
        });
    });

    describe('mergeDeep', () => {
        it('merges nested objects into the target and returns it', () => {
            const target = {chart: {type: 'line', height: 300}, credits: false},
                ret = mergeDeep(target, {chart: {height: 400}, legend: {enabled: true}});

            expect(ret).toBe(target);
            expect(target).toEqual({
                chart: {type: 'line', height: 400},
                credits: false,
                legend: {enabled: true}
            });
        });

        it('replaces arrays rather than merging them by index', () => {
            // 66.1.1 (b346a49a0) fixed mergeDeep keeping the target's arrays.
            const conf = mergeDeep(
                {series: [{name: 'Bid'}, {name: 'Ask'}], yAxis: [{min: 0, title: {text: 'Px'}}]},
                {series: [{name: 'Mid'}], yAxis: [{max: 100}]}
            );

            expect(conf.series).toEqual([{name: 'Mid'}]);
            expect(conf.yAxis).toEqual([{max: 100}]);
        });

        it('applies sources in order, skipping undefined values but not null', () => {
            const conf = mergeDeep(
                {},
                {height: 300, title: 'Positions', zoom: 'x'},
                {height: undefined, title: null},
                {zoom: 'xy'}
            );

            expect(conf).toEqual({height: 300, title: null, zoom: 'xy'});
        });

        it('leaves its sources unmodified, so one default can seed many results', () => {
            // Chart merges the same default axis config into a new object for each axis.
            const defaults = {labels: {style: {fontSize: '11px'}}},
                left = mergeDeep({}, defaults, {labels: {style: {color: 'red'}}}),
                right = mergeDeep({}, defaults, {labels: {format: '{value}%'}});

            expect(defaults).toEqual({labels: {style: {fontSize: '11px'}}});
            expect(left.labels).toEqual({style: {fontSize: '11px', color: 'red'}});
            expect(right.labels).toEqual({style: {fontSize: '11px'}, format: '{value}%'});
        });
    });

    describe('pluralize', () => {
        it('pluralizes to match a count, optionally prefixed with that count', () => {
            // Pins the contract of this wrapper over the unmaintained lodash-inflection package.
            expect(pluralize('role', 1, true)).toBe('1 role');
            expect(pluralize('role', 0, true)).toBe('0 roles');
            expect(pluralize('selected entry', 3, true)).toBe('3 selected entries');
            expect(pluralize('file', 1)).toBe('file');
            expect(pluralize('person')).toBe('people');
        });
    });

    describe('parseNameSource', () => {
        class PositionsModel extends HoistModel {}
        class QuoteService extends HoistService {}

        it('labels a HoistBase instance by class and name, or by short id when unnamed', () => {
            const named = new PositionsModel(),
                unnamed = new PositionsModel();
            onTestFinished(() => {
                named.destroy();
                unnamed.destroy();
            });
            named.xhName = 'positions';

            expect(parseNameSource(named)).toBe('PositionsModel [positions]');
            expect(parseNameSource(unnamed)).toMatch(/^PositionsModel \[\d+]$/);
        });

        it('labels a singleton service by its class name alone', () => {
            // Service install names each singleton after its class, e.g. `quoteService`.
            const svc = new QuoteService();
            onTestFinished(() => svc.destroy());
            svc.xhName = 'quoteService';

            expect(parseNameSource(svc)).toBe('QuoteService');
        });

        it('names other sources by string, displayName or class name', () => {
            class CsvParser {}

            expect(parseNameSource('Bootstrap')).toBe('Bootstrap');
            expect(parseNameSource({displayName: 'GridCountLabel'})).toBe('GridCountLabel');
            expect(parseNameSource(new CsvParser())).toBe('CsvParser');
            // 7ba022459 fixed logging with no source throwing.
            expect(parseNameSource(null)).toBeNull();
        });
    });
});
