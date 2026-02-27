import {endOfDay, olderThan, startOfDay} from '@xh/hoist/utils/datetime/DateTimeUtils';

describe('olderThan', () => {
    it('returns true for null input', () => {
        expect(olderThan(null, 1000)).toBe(true);
    });

    it('returns true when timestamp is older than threshold', () => {
        const fiveSecondsAgo = Date.now() - 5000;
        expect(olderThan(fiveSecondsAgo, 3000)).toBe(true);
    });

    it('returns false when timestamp is newer than threshold', () => {
        const oneSecondAgo = Date.now() - 1000;
        expect(olderThan(oneSecondAgo, 3000)).toBe(false);
    });

    it('accepts Date objects', () => {
        const recentDate = new Date(Date.now() - 1000);
        const oldDate = new Date(Date.now() - 10000);
        expect(olderThan(recentDate, 3000)).toBe(false);
        expect(olderThan(oldDate, 3000)).toBe(true);
    });
});

describe('startOfDay', () => {
    it('returns midnight for a given date', () => {
        const date = new Date(2024, 5, 15, 14, 30, 45); // Jun 15 2024 at 2:30:45 PM
        const result = startOfDay(date);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
    });

    it('preserves the original date (day/month/year)', () => {
        const date = new Date(2024, 5, 15, 14, 30, 45);
        const result = startOfDay(date);
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(5);
        expect(result.getDate()).toBe(15);
    });

    it('uses current date when no argument is provided', () => {
        const result = startOfDay();
        const now = new Date();
        expect(result.getFullYear()).toBe(now.getFullYear());
        expect(result.getMonth()).toBe(now.getMonth());
        expect(result.getDate()).toBe(now.getDate());
        expect(result.getHours()).toBe(0);
    });
});

describe('endOfDay', () => {
    it('returns 23:59:59 for a given date', () => {
        const date = new Date(2024, 5, 15, 8, 0, 0); // Jun 15 2024 at 8:00 AM
        const result = endOfDay(date);
        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
        expect(result.getSeconds()).toBe(59);
    });

    it('preserves the original date (day/month/year)', () => {
        const date = new Date(2024, 5, 15);
        const result = endOfDay(date);
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(5);
        expect(result.getDate()).toBe(15);
    });
});
