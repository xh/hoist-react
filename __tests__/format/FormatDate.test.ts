// Prevent LocalDate.ts → @xh/hoist/core → XH cascade.
jest.mock('@xh/hoist/utils/datetime', () => {
    class LocalDate {}
    return {
        LocalDate,
        DAYS: 86400000,
        isLocalDate: (v: any) => v instanceof LocalDate
    };
});
// Prevent fmtSpan → span → @xh/hoist/core cascade.
jest.mock('@xh/hoist/cmp/layout', () => ({span: (spec: any) => spec}));

import {fmtDate, fmtDateTime, fmtTime, timestampReplacer} from '@xh/hoist/format/FormatDate';

// Use the local Date constructor so tests are timezone-safe.
const JUN_15 = new Date(2024, 5, 15); // June 15, 2024
const JUN_15_AFTERNOON = new Date(2024, 5, 15, 14, 30); // June 15, 2024 2:30 PM
const JUN_15_MORNING = new Date(2024, 5, 15, 9, 5); // June 15, 2024 9:05 AM

describe('fmtDate', () => {
    it('formats a Date with the default YYYY-MM-DD format', () => {
        expect(fmtDate(JUN_15)).toBe('2024-06-15');
    });

    it('returns empty string for null and undefined', () => {
        expect(fmtDate(null)).toBe('');
        expect(fmtDate(undefined)).toBe('');
    });

    it('accepts a format string as the second argument', () => {
        expect(fmtDate(JUN_15, 'D MMM YYYY')).toBe('15 Jun 2024');
        expect(fmtDate(JUN_15, 'YYYYMMDD')).toBe('20240615');
    });

    it('accepts a format option object', () => {
        expect(fmtDate(JUN_15, {fmt: 'MMM D'})).toBe('Jun 15');
    });

    it('returns nullDisplay when provided for a null value', () => {
        expect(fmtDate(null, {nullDisplay: 'N/A'})).toBe('N/A');
    });

    it('accepts a numeric timestamp', () => {
        expect(fmtDate(JUN_15.getTime())).toBe('2024-06-15');
    });
});

describe('fmtDateTime', () => {
    it('includes both date and time in output', () => {
        const result = fmtDateTime(JUN_15_AFTERNOON) as string;
        expect(result).toContain('2024-06-15');
        expect(result).toMatch(/2:30pm/i);
    });

    it('returns empty string for null', () => {
        expect(fmtDateTime(null)).toBe('');
    });

    it('accepts a custom format string', () => {
        expect(fmtDateTime(JUN_15_AFTERNOON, 'YYYY-MM-DD HH:mm')).toBe('2024-06-15 14:30');
    });
});

describe('fmtTime', () => {
    it('formats a Date as time only', () => {
        const result = fmtTime(JUN_15_MORNING) as string;
        expect(result).toMatch(/9:05am/i);
    });

    it('returns empty string for null', () => {
        expect(fmtTime(null)).toBe('');
    });
});

describe('timestampReplacer', () => {
    const NOW = Date.now();

    it('replaces keys ending with default suffixes when the value is a plausible timestamp', () => {
        const replacer = timestampReplacer();
        expect(typeof replacer('createdTime', NOW)).toBe('string');
        expect(typeof replacer('updatedDate', NOW)).toBe('string');
        expect(typeof replacer('loadTimestamp', NOW)).toBe('string');
    });

    it('passes through non-timestamp keys unchanged', () => {
        const replacer = timestampReplacer();
        expect(replacer('label', NOW)).toBe(NOW);
        expect(replacer('someKey', 'hello')).toBe('hello');
    });

    it('passes through small numbers that are not plausible timestamps', () => {
        const replacer = timestampReplacer();
        // 250 ms is well below any real timestamp (year ~1970 + a fraction of a second)
        expect(replacer('loadTime', 250)).toBe(250);
    });

    it('respects custom suffixes', () => {
        const replacer = timestampReplacer({suffixes: ['At']});
        expect(typeof replacer('createdAt', NOW)).toBe('string');
        // 'createdTime' no longer matches
        expect(replacer('createdTime', NOW)).toBe(NOW);
    });

    it('works as a JSON.stringify replacer', () => {
        const json = JSON.stringify({createdTime: NOW, name: 'test'}, timestampReplacer());
        const parsed = JSON.parse(json);
        expect(typeof parsed.createdTime).toBe('string'); // formatted timestamp
        expect(parsed.name).toBe('test'); // untouched
    });
});
