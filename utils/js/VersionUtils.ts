/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

/**
 * Check if a version string falls within a range.
 *
 * Versions follow semver precedence: `x.y.z` compared numerically, then any `-prerelease`
 * identifiers, so `40.5.0-SNAPSHOT` sorts below `40.5.0`. Build metadata after `+` is ignored.
 * The bounds may use `x` or `*` wildcards, as in `36.*.*` for any 36 release, or omit trailing
 * parts, as in `40.5`. A version that does not parse never satisfies a check.
 */
export function checkVersion(version: string, minVersion: string, maxVersion: string): boolean {
    return checkMinVersion(version, minVersion) && checkMaxVersion(version, maxVersion);
}

/**
 * Check if a version string meets a minimum version. See {@link checkVersion}.
 */
export function checkMinVersion(version: string, minVersion: string): boolean {
    const v = parseVersion(normalizeVersion(version)),
        min = parseBound(normalizeVersion(minVersion));
    return !!v && !!min && compareVersions(v, min.lower) >= 0;
}

/**
 * Check if a version string meets a maximum version. See {@link checkVersion}.
 */
export function checkMaxVersion(version: string, maxVersion: string): boolean {
    const v = parseVersion(normalizeVersion(version)),
        max = parseBound(normalizeVersion(maxVersion));
    if (!v || !max) return false;
    // A wildcard bound such as `36.*.*` admits everything below the next release, `37.0.0`,
    // while rejecting that release's own prereleases - the same reading semver gives `<=36.x`.
    return max.upper ? compareVersions(v, max.upper) < 0 : compareVersions(v, max.lower) <= 0;
}

/**
 * Normalizes a Java/Maven style x.0-SNAPSHOT version to a semver compatible x.0.0-SNAPSHOT string.
 * @returns normalized version, if input matched as above, or input version unmodified.
 */
export function normalizeVersion(version: string): string {
    const isTwoDigitSnap = /^\d+\.0-SNAPSHOT$/.test(version);
    return isTwoDigitSnap ? version.replace('-SNAPSHOT', '.0-SNAPSHOT') : version;
}

//------------------------
// Implementation
//------------------------
interface Version {
    main: [number, number, number];
    prerelease: (string | number)[];
}

/** Lower bound a range accepts, and the exclusive upper bound a wildcard range implies. */
interface Bound {
    lower: Version;
    upper: Version;
}

const NUM = '(0|[1-9]\\d*)',
    IDS = '[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*',
    VERSION_RE = new RegExp(`^[v=]?${NUM}\\.${NUM}\\.${NUM}(?:-(${IDS}))?(?:\\+${IDS})?$`),
    PART = '(\\d+|[xX*])',
    BOUND_RE = new RegExp(
        `^[v=]?${PART}(?:\\.${PART})?(?:\\.${PART})?(?:-(${IDS}))?(?:\\+${IDS})?$`
    );

function parseVersion(version: string): Version {
    const match = typeof version === 'string' ? version.trim().match(VERSION_RE) : null;
    if (!match) return null;
    return {
        main: [+match[1], +match[2], +match[3]],
        prerelease: parsePrerelease(match[4])
    };
}

function parseBound(bound: string): Bound {
    const match = typeof bound === 'string' ? bound.trim().match(BOUND_RE) : null;
    if (!match) return null;

    const parts = [match[1], match[2], match[3]],
        wildcardAt = parts.findIndex(p => p == null || /[xX*]/.test(p)),
        main = parts.map(p => (p == null || /[xX*]/.test(p) ? 0 : +p)) as Version['main'];

    if (wildcardAt === -1)
        return {lower: {main, prerelease: parsePrerelease(match[4])}, upper: null};

    // Everything matches a leading wildcard. Otherwise, bump the part before the wildcard.
    const upper: Version['main'] = [...main];
    if (wildcardAt > 0) upper[wildcardAt - 1]++;
    return {
        lower: {main, prerelease: []},
        upper:
            wildcardAt === 0
                ? {main: [Infinity, 0, 0], prerelease: []}
                : {main: upper, prerelease: [0]}
    };
}

function parsePrerelease(ids: string): (string | number)[] {
    return ids ? ids.split('.').map(id => (/^\d+$/.test(id) ? +id : id)) : [];
}

/** Semver precedence: negative when a sorts before b, positive when after, zero when equal. */
function compareVersions(a: Version, b: Version): number {
    for (let i = 0; i < 3; i++) {
        if (a.main[i] !== b.main[i]) return a.main[i] - b.main[i];
    }

    // A release outranks its own prereleases. Among prereleases, compare identifier by
    // identifier: numeric before alphanumeric, and a shorter list first when all else is equal.
    const aPre = a.prerelease,
        bPre = b.prerelease;
    if (!aPre.length || !bPre.length) return bPre.length - aPre.length;

    for (let i = 0; i < Math.min(aPre.length, bPre.length); i++) {
        const x = aPre[i],
            y = bPre[i];
        if (x === y) continue;
        if (typeof x === 'number' && typeof y === 'number') return x - y;
        if (typeof x === 'number') return -1;
        if (typeof y === 'number') return 1;
        return x < y ? -1 : 1;
    }
    return aPre.length - bPre.length;
}
