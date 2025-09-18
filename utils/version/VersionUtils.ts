/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import semver from 'semver';

/**
 * Check if a version string falls within a range
 */
export function checkVersion(version: string, minVersion: string, maxVersion: string): boolean {
    return checkMinVersion(version, minVersion) && checkMaxVersion(version, maxVersion);
}

/**
 * Check if a version string meets a minimum version
 */
export function checkMinVersion(version: string, minVersion: string): boolean {
    return (
        version &&
        minVersion &&
        semver.satisfies(normalizeVersion(version), '>=' + normalizeVersion(minVersion), {
            includePrerelease: true
        })
    );
}

/**
 * Check if a version string meets a maximum version
 */
export function checkMaxVersion(version: string, maxVersion: string): boolean {
    return (
        version &&
        maxVersion &&
        semver.satisfies(normalizeVersion(version), '<=' + normalizeVersion(maxVersion), {
            includePrerelease: true
        })
    );
}

/**
 * Normalizes a Java/Maven style x.0-SNAPSHOT version to a semver compatible x.0.0-SNAPSHOT string.
 * @returns normalized version, if input matched as above, or input version unmodified.
 */
export function normalizeVersion(version: string): string {
    const isTwoDigitSnap = /^\d+\.0-SNAPSHOT$/.test(version);
    return isTwoDigitSnap ? version.replace('-SNAPSHOT', '.0-SNAPSHOT') : version;
}
