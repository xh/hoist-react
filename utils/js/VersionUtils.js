/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import semver from 'semver';

/**
 * Check if a version string meets a required version
 * @return boolean
 */
export function checkVersion(version, requiredVersion) {
    version = parseVersion(version);
    requiredVersion = parseVersion(requiredVersion);
    return version && requiredVersion && semver.gte(version, requiredVersion);
}

/**
 * Parse and validate a semver string.
 * @return string if valid, or null.
 */
export function parseVersion(version) {
    if (!version) return null;
    return semver.clean(version.replace('-SNAPSHOT', '.0'));
}