import {
    checkMaxVersion,
    checkMinVersion,
    checkVersion,
    normalizeVersion
} from '@xh/hoist/utils/js/VersionUtils';

describe('normalizeVersion', () => {
    it('converts a two-part Java/Maven SNAPSHOT to three-part semver', () => {
        expect(normalizeVersion('82.0-SNAPSHOT')).toBe('82.0.0-SNAPSHOT');
        expect(normalizeVersion('1.0-SNAPSHOT')).toBe('1.0.0-SNAPSHOT');
    });

    it('leaves three-part semver versions unchanged', () => {
        expect(normalizeVersion('1.2.3')).toBe('1.2.3');
        expect(normalizeVersion('82.0.0-SNAPSHOT')).toBe('82.0.0-SNAPSHOT');
    });

    it('leaves non-SNAPSHOT two-part versions unchanged', () => {
        expect(normalizeVersion('1.0')).toBe('1.0');
    });
});

describe('checkMinVersion', () => {
    it('returns true when version meets minimum', () => {
        expect(checkMinVersion('2.0.0', '1.0.0')).toBe(true);
        expect(checkMinVersion('1.0.0', '1.0.0')).toBe(true); // equal satisfies >=
        expect(checkMinVersion('1.1.0', '1.0.0')).toBe(true);
    });

    it('returns false when version is below minimum', () => {
        expect(checkMinVersion('1.0.0', '2.0.0')).toBe(false);
        expect(checkMinVersion('0.9.9', '1.0.0')).toBe(false);
    });

    it('returns falsy when version or minVersion is null/undefined', () => {
        expect(checkMinVersion(null, '1.0.0')).toBeFalsy();
        expect(checkMinVersion('1.0.0', null)).toBeFalsy();
    });

    it('handles SNAPSHOT versions with normalization', () => {
        expect(checkMinVersion('82.0.0-SNAPSHOT', '81.0.0')).toBe(true);
        // Pre-release (SNAPSHOT) versions are less than their release in semver, so
        // 82.0.0-SNAPSHOT does NOT satisfy >= 82.0.0
        expect(checkMinVersion('82.0-SNAPSHOT', '82.0.0')).toBe(false);
    });
});

describe('checkMaxVersion', () => {
    it('returns true when version is within maximum', () => {
        expect(checkMaxVersion('1.0.0', '2.0.0')).toBe(true);
        expect(checkMaxVersion('1.0.0', '1.0.0')).toBe(true); // equal satisfies <=
        expect(checkMaxVersion('0.9.9', '1.0.0')).toBe(true);
    });

    it('returns false when version exceeds maximum', () => {
        expect(checkMaxVersion('2.0.0', '1.0.0')).toBe(false);
        expect(checkMaxVersion('1.0.1', '1.0.0')).toBe(false);
    });

    it('returns falsy when version or maxVersion is null/undefined', () => {
        expect(checkMaxVersion(null, '1.0.0')).toBeFalsy();
        expect(checkMaxVersion('1.0.0', null)).toBeFalsy();
    });
});

describe('checkVersion', () => {
    it('returns true when version is within range', () => {
        expect(checkVersion('1.5.0', '1.0.0', '2.0.0')).toBe(true);
        expect(checkVersion('1.0.0', '1.0.0', '2.0.0')).toBe(true); // at min boundary
        expect(checkVersion('2.0.0', '1.0.0', '2.0.0')).toBe(true); // at max boundary
    });

    it('returns false when version is below range', () => {
        expect(checkVersion('0.9.0', '1.0.0', '2.0.0')).toBe(false);
    });

    it('returns false when version is above range', () => {
        expect(checkVersion('2.1.0', '1.0.0', '2.0.0')).toBe(false);
    });
});
