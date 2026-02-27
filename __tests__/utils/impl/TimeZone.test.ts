// Stop fmtNumber → span → @xh/hoist/core cascade.
jest.mock('@xh/hoist/format', () => ({
    fmtNumber: (v: number) => String(v)
}));
// Provide HOURS constant without loading the full datetime module (LocalDate → XH).
jest.mock('@xh/hoist/utils/datetime', () => ({
    HOURS: 3600000
}));

import {fmtTimeZone} from '@xh/hoist/utils/impl/TimeZone';

describe('fmtTimeZone', () => {
    it('returns empty string for an empty name', () => {
        expect(fmtTimeZone('', 0)).toBe('');
    });

    it('returns empty string for a null name', () => {
        expect(fmtTimeZone(null, 0)).toBe('');
    });

    it('returns "GMT" unchanged', () => {
        expect(fmtTimeZone('GMT', 5 * 3600000)).toBe('GMT');
    });

    it('returns "UTC" unchanged', () => {
        expect(fmtTimeZone('UTC', 0)).toBe('UTC');
    });

    it('formats a negative UTC offset in hours for a named timezone', () => {
        // fmtNumber mock returns String(v), so -5 * HOURS / HOURS = -5 → "-5"
        expect(fmtTimeZone('America/New_York', -5 * 3600000)).toBe('America/New_York (GMT-5)');
    });

    it('formats a positive UTC offset in hours for a named timezone', () => {
        expect(fmtTimeZone('Europe/Paris', 1 * 3600000)).toBe('Europe/Paris (GMT1)');
    });
});
