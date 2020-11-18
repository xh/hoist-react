/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
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
    // Treat snapshot versions as the next major version for min comparison
    if (version?.endsWith('SNAPSHOT')) {
        version = version.replace('-SNAPSHOT', '.0');
    }
    return version && minVersion && semver.satisfies(version, '>=' + minVersion);
}

/**
 * Check if a version string meets a maximum version
 * @return boolean
 */
export function checkMaxVersion(version, maxVersion) {
    // Treat snapshot versions as the previous major version for max comparison
    if (version?.endsWith('SNAPSHOT')) {
        version = (parseInt(version) - 1) + '.0.0';
    }
    return version && maxVersion && semver.satisfies(version, '<=' + maxVersion);
}