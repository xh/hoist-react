/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isString} from 'lodash';

/**
 * Check if a version string falls within a range.
 *
 * Versions are `x.y.z`, compared numerically, with an optional `-prerelease` that sorts below
 * its release, so `40.5.0-SNAPSHOT` is below `40.5.0`. Bounds may end in `*` or `x` wildcards,
 * as in `36.*.*` for any 36 release. A version that does not parse never satisfies a check.
 */
export function checkVersion(version: string, minVersion: string, maxVersion: string): boolean {
    return checkMinVersion(version, minVersion) && checkMaxVersion(version, maxVersion);
}

/** Check if a version string meets a minimum version. See {@link checkVersion}. */
export function checkMinVersion(version: string, minVersion: string): boolean {
    const v = parseVersion(version),
        min = parseVersion(minVersion, true);
    return !!v && !!min && compareVersions(v, min) >= 0;
}

/** Check if a version string meets a maximum version. See {@link checkVersion}. */
export function checkMaxVersion(version: string, maxVersion: string): boolean {
    const v = parseVersion(version),
        max = parseVersion(maxVersion, true);
    if (!v || !max) return false;
    // A wildcard maximum such as `36.*.*` admits any version that matches its fixed parts.
    return max.fixedParts < 3
        ? max.main.slice(0, max.fixedParts).every((n, i) => n === v.main[i])
        : compareVersions(v, max) <= 0;
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
    main: number[];
    prerelease: string;
    /** Count of leading `main` parts given as numbers - 3 unless the version has wildcards. */
    fixedParts: number;
}

const VERSION_RE = /^(\d+)\.(\d+|[x*])\.(\d+|[x*])(?:-([\w.-]+))?$/i;

function parseVersion(version: string, allowWildcards = false): Version {
    const match = isString(version) ? normalizeVersion(version.trim()).match(VERSION_RE) : null;
    if (!match) return null;

    const parts = match.slice(1, 4),
        wildcardAt = parts.findIndex(p => isNaN(+p));
    if (wildcardAt !== -1 && !allowWildcards) return null;

    return {
        main: parts.map(p => (isNaN(+p) ? 0 : +p)),
        prerelease: match[4] ?? '',
        fixedParts: wildcardAt === -1 ? 3 : wildcardAt
    };
}

/** Negative when a sorts before b, positive when after, zero when equal. */
function compareVersions(a: Version, b: Version): number {
    for (let i = 0; i < 3; i++) {
        if (a.main[i] !== b.main[i]) return a.main[i] - b.main[i];
    }
    // A release outranks its own prereleases. Two prereleases compare as strings.
    if (!a.prerelease !== !b.prerelease) return a.prerelease ? -1 : 1;
    return a.prerelease < b.prerelease ? -1 : a.prerelease > b.prerelease ? 1 : 0;
}
