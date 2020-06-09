/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import compareVersions from 'compare-versions';

/**
 * The exports below are ag-Grid components provided at runtime by applications.
 *
 * This allows applications to provide Hoist with their duly imported and licensed
 * versions of ag-Grid.  In particular, note that many (but not all) users of Hoist
 * will be expected to have the enterprise version of ag-Grid.
 *
 * See the file agGrid.js in the application's root directory.
 */
export let AgGridReact = null;
export let AgGridUtils = null;
export let agGridVersion = null;

const MIN_VERSION = '23.0.2';
const MAX_VERSION = '23.*.*';

/**
 * Expose application versions of ag-Grid to Hoist.
 */
export function installAgGridImpls(ComponentReactWrapper, Utils, version) {
    if (compareVersions(version, MIN_VERSION) < 0 || compareVersions(version, MAX_VERSION) > 0) {
        console.error(
            `This version of Hoist requires an ag-Grid version between ${MIN_VERSION} and ` +
            `${MAX_VERSION}. ag-Grid will be unavailable.`
        );
        return;
    }

    AgGridReact = ComponentReactWrapper;
    AgGridUtils = Utils;
    agGridVersion = version;
}