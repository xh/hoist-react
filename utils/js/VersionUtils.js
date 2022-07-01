/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import semver from 'semver';

/**
 * Check if a version string falls within a range
 * @return boolean
 */
export function checkVersion(version, minVersion, maxVersion) {
    return checkMinVersion(version, minVersion) && checkMaxVersion(version, maxVersion);
}

/**
 * Check if a version string meets a minimum version
 * @return boolean
 */
export function checkMinVersion(version, minVersion) {
    return (
        version &&
        minVersion &&
        semver.satisfies(
            normalizeVersion(version),
            '>=' + normalizeVersion(minVersion),
            {includePrerelease: true}
        )
    );
}

/**
 * Check if a version string meets a maximum version
 * @return boolean
 */
export function checkMaxVersion(version, maxVersion) {
    return (
        version &&
        maxVersion &&
        semver.satisfies(
            normalizeVersion(version),
            '<=' + normalizeVersion(maxVersion),
            {includePrerelease: true}
        )
    );
}

/**
 * Normalizes a Java/Maven style x.0-SNAPSHOT version to a semver compatible x.0.0-SNAPSHOT string.
 * @param {string} version
 * @return {string} - normalized version, if input matched as above, or input version unmodified.
 */
export function normalizeVersion(version) {
    const isTwoDigitSnap = /^\d+\.0-SNAPSHOT$/.test(version);
    return isTwoDigitSnap ? version.replace('-SNAPSHOT', '.0-SNAPSHOT') : version;
}
