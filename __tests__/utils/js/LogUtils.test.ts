import {
    getLogLevel,
    setLogLevel,
    warnIf,
    errorIf,
    apiRemoved,
    apiDeprecated,
    withInfo
} from '@xh/hoist/utils/js/LogUtils';

// Silence all console output produced by the module under test throughout this file.
beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
    jest.restoreAllMocks();
});

// Reset log level to default after every test so state does not leak between tests.
afterEach(() => {
    setLogLevel('info');
    jest.clearAllMocks();
});

//----------------------------------
// getLogLevel / setLogLevel
//----------------------------------
describe('getLogLevel / setLogLevel', () => {
    it('default level is "info"', () => {
        expect(getLogLevel()).toBe('info');
    });

    it('setLogLevel updates the active log level', () => {
        setLogLevel('debug');
        expect(getLogLevel()).toBe('debug');
    });

    it('setLogLevel is case-insensitive', () => {
        setLogLevel('WARN' as any);
        expect(getLogLevel()).toBe('warn');
    });

    it('setLogLevel ignores unrecognised level strings', () => {
        setLogLevel('verbose' as any);
        expect(getLogLevel()).toBe('info'); // unchanged
    });
});

//----------------------------------
// warnIf / errorIf
//----------------------------------
describe('warnIf', () => {
    it('logs when condition is truthy', () => {
        warnIf(true, 'watch out');
        expect(console.warn).toHaveBeenCalled();
    });

    it('does not log when condition is falsy', () => {
        warnIf(false, 'watch out');
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not log for null / undefined / 0 conditions', () => {
        warnIf(null, 'msg');
        warnIf(undefined, 'msg');
        warnIf(0, 'msg');
        expect(console.warn).not.toHaveBeenCalled();
    });
});

describe('errorIf', () => {
    it('logs when condition is truthy', () => {
        errorIf(true, 'problem');
        expect(console.error).toHaveBeenCalled();
    });

    it('does not log when condition is falsy', () => {
        errorIf(false, 'problem');
        expect(console.error).not.toHaveBeenCalled();
    });
});

//----------------------------------
// apiRemoved
//----------------------------------
describe('apiRemoved', () => {
    it('throws mentioning the removed parameter name', () => {
        expect(() => apiRemoved('oldParam')).toThrow(/oldParam/);
    });

    it('throw message includes "no longer supported"', () => {
        expect(() => apiRemoved('oldParam')).toThrow(/no longer supported/i);
    });

    it('is a no-op when the test option is explicitly undefined', () => {
        expect(() => apiRemoved('param', {test: undefined})).not.toThrow();
    });

    it('throws when the test option is any defined value', () => {
        expect(() => apiRemoved('param', {test: null})).toThrow();
        expect(() => apiRemoved('param', {test: 0})).toThrow();
    });

    it('appends msg when the msg option is provided', () => {
        expect(() => apiRemoved('oldParam', {msg: 'Use newParam instead.'})).toThrow(
            /Use newParam/
        );
    });
});

//----------------------------------
// apiDeprecated
//----------------------------------
describe('apiDeprecated', () => {
    it('logs a deprecation warning on first call', () => {
        apiDeprecated(`feature_first_${Date.now()}`);
        expect(console.warn).toHaveBeenCalled();
    });

    it('is a no-op when test option is explicitly undefined', () => {
        apiDeprecated(`feature_noop_${Date.now()}`, {test: undefined});
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('only warns once for the same message (deduplication)', () => {
        const name = `feature_dedup_${Date.now()}`;
        apiDeprecated(name);
        jest.clearAllMocks();
        apiDeprecated(name); // second call — same message, should be silent
        expect(console.warn).not.toHaveBeenCalled();
    });
});

//----------------------------------
// withInfo
//----------------------------------
describe('withInfo', () => {
    it('executes the wrapped function and returns its result', () => {
        expect(withInfo('test op', () => 42)).toBe(42);
    });

    it('logs timing information after the function runs', () => {
        withInfo('logged op', () => {});
        expect(console.log).toHaveBeenCalled();
    });

    it('re-throws exceptions from the wrapped function', () => {
        expect(() =>
            withInfo('failing op', () => {
                throw new Error('boom');
            })
        ).toThrow('boom');
    });

    it('skips logging when logLevel is above "info"', () => {
        setLogLevel('error');
        jest.clearAllMocks();
        expect(withInfo('silent op', () => 99)).toBe(99);
        expect(console.log).not.toHaveBeenCalled();
    });
});
