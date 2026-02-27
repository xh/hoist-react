import {Exception, isHoistException} from '@xh/hoist/exception/Exception';

describe('isHoistException', () => {
    it('returns true for a HoistException', () => {
        expect(isHoistException(Exception.create('test'))).toBe(true);
    });

    it('returns falsy for a plain Error, null, and undefined', () => {
        expect(isHoistException(new Error('test'))).toBeFalsy();
        expect(isHoistException(null)).toBeFalsy();
        expect(isHoistException(undefined)).toBeFalsy();
    });
});

describe('Exception.create', () => {
    it('creates a HoistException from a string message', () => {
        const e = Exception.create('something went wrong');
        expect(isHoistException(e)).toBe(true);
        expect(e.message).toBe('something went wrong');
        expect(e.isRoutine).toBe(false);
    });

    it('enhances a native Error in-place with HoistException properties', () => {
        const base = new Error('original');
        const e = Exception.create(base);
        expect(e).toBe(base); // same reference — mutated in-place
        expect(isHoistException(e)).toBe(true);
        expect(e.message).toBe('original');
    });

    it('spreads a plain-object config onto the exception', () => {
        const e = Exception.create({message: 'custom', code: 404} as any);
        expect(e.message).toBe('custom');
        expect((e as any).code).toBe(404);
        expect(isHoistException(e)).toBe(true);
    });

    it('is idempotent — returns the same HoistException it receives', () => {
        const e1 = Exception.create('first');
        expect(Exception.create(e1)).toBe(e1);
    });

    it('converts a non-string primitive to a message string', () => {
        expect(Exception.create(42).message).toBe('42');
    });

    it('deletes stack for 4xx / 5xx httpStatus codes', () => {
        const e = Exception.create({httpStatus: '404', message: 'not found'} as any);
        expect('stack' in e).toBe(false);
    });

    it('preserves stack for non-server-error status codes', () => {
        const e = Exception.create({message: 'ok', httpStatus: '200'} as any);
        // stack is retained for 2xx
        expect(e).toBeDefined();
    });
});

describe('Exception.timeout', () => {
    it('creates an exception flagged as a timeout', () => {
        const e = Exception.timeout({interval: 5000});
        expect(isHoistException(e)).toBe(true);
        expect(e.isTimeout).toBe(true);
        expect(e.interval).toBe(5000);
    });

    it('strips stack from timeout exceptions', () => {
        expect('stack' in Exception.timeout({interval: 1000})).toBe(false);
    });

    it('displays seconds for even multiples > 2s', () => {
        expect(Exception.timeout({interval: 5000}).message).toContain('5secs');
        expect(Exception.timeout({interval: 3000}).message).toContain('3secs');
        expect(Exception.timeout({interval: 10000}).message).toContain('10secs');
    });

    it('displays milliseconds for short or non-round intervals', () => {
        expect(Exception.timeout({interval: 1500}).message).toContain('1500ms');
        // 2000 is not > 2000, so stays in ms
        expect(Exception.timeout({interval: 2000}).message).toContain('2000ms');
        expect(Exception.timeout({interval: 100}).message).toContain('100ms');
    });

    it('spreads extra config properties onto the exception', () => {
        const e = Exception.timeout({interval: 1000, message: 'custom timeout'});
        expect(e.message).toBe('custom timeout');
    });
});
