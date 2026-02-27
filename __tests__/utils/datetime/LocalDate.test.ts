// XH is only used in currentAppDay/currentServerDay — not tested here.
jest.mock('@xh/hoist/core', () => ({
    XH: {environmentService: {get: () => 0}}
}));

import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime/LocalDate';

describe('LocalDate.get', () => {
    it('creates a LocalDate from a YYYY-MM-DD string', () => {
        expect(LocalDate.get('2024-06-15').isoString).toBe('2024-06-15');
    });

    it('accepts YYYYMMDD compact format and normalizes it', () => {
        expect(LocalDate.get('20240615').isoString).toBe('2024-06-15');
    });

    it('returns null/undefined unchanged', () => {
        expect(LocalDate.get(null)).toBeNull();
        expect(LocalDate.get(undefined)).toBeUndefined();
    });

    it('throws for an invalid date string', () => {
        expect(() => LocalDate.get('not-a-date')).toThrow();
        expect(() => LocalDate.get('2024-13-01')).toThrow(); // month 13 is invalid
    });

    it('memoizes — same string returns the same instance', () => {
        const a = LocalDate.get('2024-01-01');
        const b = LocalDate.get('2024-01-01');
        expect(a).toBe(b);
    });
});

describe('LocalDate.from', () => {
    it('creates a LocalDate from a native Date', () => {
        expect(LocalDate.from(new Date(2024, 5, 15)).isoString).toBe('2024-06-15');
    });

    it('returns the same LocalDate when passed a LocalDate', () => {
        const ld = LocalDate.get('2024-06-15');
        expect(LocalDate.from(ld)).toBe(ld);
    });

    it('returns null for null input', () => {
        expect(LocalDate.from(null)).toBeNull();
    });
});

describe('LocalDate arithmetic', () => {
    it('adds days', () => {
        expect(LocalDate.get('2024-06-15').add(3).isoString).toBe('2024-06-18');
    });

    it('subtracts days', () => {
        expect(LocalDate.get('2024-06-15').subtract(5).isoString).toBe('2024-06-10');
    });

    it('crosses month boundaries', () => {
        expect(LocalDate.get('2024-01-31').add(1).isoString).toBe('2024-02-01');
    });

    it('crosses year boundaries', () => {
        expect(LocalDate.get('2023-12-31').add(1).isoString).toBe('2024-01-01');
    });

    it('adds weeks', () => {
        expect(LocalDate.get('2024-06-15').add(1, 'weeks').isoString).toBe('2024-06-22');
    });

    it('throws for an unsupported unit', () => {
        expect(() => LocalDate.get('2024-06-15').add(1, 'hours' as any)).toThrow();
    });

    it('diffs two dates in days', () => {
        const a = LocalDate.get('2024-06-10');
        const b = LocalDate.get('2024-06-15');
        expect(b.diff(a)).toBe(5);
        expect(a.diff(b)).toBe(-5);
    });

    it('diffs in months', () => {
        const a = LocalDate.get('2024-01-01');
        const b = LocalDate.get('2024-04-01');
        expect(b.diff(a, 'months')).toBe(3);
    });
});

describe('LocalDate weekday helpers', () => {
    it('correctly identifies weekdays and weekend days', () => {
        expect(LocalDate.get('2024-06-17').isWeekday).toBe(true); // Monday
        expect(LocalDate.get('2024-06-14').isWeekday).toBe(true); // Friday
        expect(LocalDate.get('2024-06-15').isWeekday).toBe(false); // Saturday
        expect(LocalDate.get('2024-06-16').isWeekday).toBe(false); // Sunday
    });

    it('nextWeekday skips from Friday to Monday', () => {
        expect(LocalDate.get('2024-06-14').nextWeekday().isoString).toBe('2024-06-17');
    });

    it('nextWeekday skips from Saturday to Monday', () => {
        expect(LocalDate.get('2024-06-15').nextWeekday().isoString).toBe('2024-06-17');
    });

    it('previousWeekday skips from Monday to Friday', () => {
        expect(LocalDate.get('2024-06-17').previousWeekday().isoString).toBe('2024-06-14');
    });

    it('previousWeekday skips from Sunday to Friday', () => {
        expect(LocalDate.get('2024-06-16').previousWeekday().isoString).toBe('2024-06-14');
    });

    it('addWeekdays advances by N business days', () => {
        // Monday + 5 weekdays = next Monday
        expect(LocalDate.get('2024-06-17').addWeekdays(5).isoString).toBe('2024-06-24');
    });

    it('subtractWeekdays with a negative value delegates to addWeekdays', () => {
        expect(LocalDate.get('2024-06-17').subtractWeekdays(-1).isoString).toBe(
            LocalDate.get('2024-06-17').addWeekdays(1).isoString
        );
    });

    it('currentOrNextWeekday returns self on a weekday', () => {
        const monday = LocalDate.get('2024-06-17');
        expect(monday.currentOrNextWeekday()).toBe(monday);
    });

    it('currentOrNextWeekday advances to Monday from Saturday', () => {
        expect(LocalDate.get('2024-06-15').currentOrNextWeekday().isoString).toBe('2024-06-17');
    });

    it('currentOrPreviousWeekday returns self on a weekday', () => {
        const friday = LocalDate.get('2024-06-14');
        expect(friday.currentOrPreviousWeekday()).toBe(friday);
    });

    it('currentOrPreviousWeekday retreats to Friday from Sunday', () => {
        expect(LocalDate.get('2024-06-16').currentOrPreviousWeekday().isoString).toBe('2024-06-14');
    });
});

describe('LocalDate calendar boundaries', () => {
    it('startOfMonth returns the first of the month', () => {
        expect(LocalDate.get('2024-06-15').startOfMonth().isoString).toBe('2024-06-01');
    });

    it('endOfMonth returns the last day of the month', () => {
        expect(LocalDate.get('2024-06-15').endOfMonth().isoString).toBe('2024-06-30');
        expect(LocalDate.get('2024-02-15').endOfMonth().isoString).toBe('2024-02-29'); // leap year
    });

    it('startOfYear returns Jan 1', () => {
        expect(LocalDate.get('2024-06-15').startOfYear().isoString).toBe('2024-01-01');
    });

    it('endOfYear returns Dec 31', () => {
        expect(LocalDate.get('2024-06-15').endOfYear().isoString).toBe('2024-12-31');
    });

    it('startOfQuarter returns the correct quarter start', () => {
        expect(LocalDate.get('2024-05-15').startOfQuarter().isoString).toBe('2024-04-01'); // Q2
        expect(LocalDate.get('2024-08-15').startOfQuarter().isoString).toBe('2024-07-01'); // Q3
    });

    it('isStartOfMonth is true only on the first', () => {
        expect(LocalDate.get('2024-06-01').isStartOfMonth).toBe(true);
        expect(LocalDate.get('2024-06-15').isStartOfMonth).toBe(false);
    });

    it('isEndOfMonth is true only on the last day', () => {
        expect(LocalDate.get('2024-06-30').isEndOfMonth).toBe(true);
        expect(LocalDate.get('2024-06-15').isEndOfMonth).toBe(false);
    });
});

describe('LocalDate serialization and identity', () => {
    it('toString returns the ISO string', () => {
        expect(LocalDate.get('2024-06-15').toString()).toBe('2024-06-15');
    });

    it('toJSON returns the ISO string', () => {
        expect(LocalDate.get('2024-06-15').toJSON()).toBe('2024-06-15');
    });

    it('format delegates to moment formatting', () => {
        expect(LocalDate.get('2024-06-15').format('D MMM YYYY')).toBe('15 Jun 2024');
        expect(LocalDate.get('2024-06-15').format('YYYYMMDD')).toBe('20240615');
    });

    it('isLocalDate getter returns true', () => {
        expect(LocalDate.get('2024-06-15').isLocalDate).toBe(true);
    });

    it('date getter returns a corresponding Date object', () => {
        const ld = LocalDate.get('2024-06-15');
        const d = ld.date;
        expect(d instanceof Date).toBe(true);
        expect(d.getFullYear()).toBe(2024);
        expect(d.getMonth()).toBe(5); // June
        expect(d.getDate()).toBe(15);
    });
});

describe('isLocalDate (standalone)', () => {
    it('returns true for LocalDate instances', () => {
        expect(isLocalDate(LocalDate.get('2024-06-15'))).toBe(true);
    });

    it('returns false for native Dates, strings, and null', () => {
        expect(isLocalDate(new Date())).toBe(false);
        expect(isLocalDate('2024-06-15')).toBe(false);
        expect(isLocalDate(null)).toBe(false);
        expect(isLocalDate(undefined)).toBe(false);
    });
});
