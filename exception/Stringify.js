/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {stripTags} from '@xh/hoist/utils/js';
import {omitBy, isNil, forOwn, isObject, isArray} from 'lodash';

/**
 * Serialize an error object safely for submission to server, or user display.
 * This method will avoid circular references and will trim the depth of the object.
 *
 * @param {Error} error
 * @return string
 */
export function stringifyErrorSafely(error) {
    try {

        // 1) Create basic structure.
        // Raw Error does not have 'own' properties, so be explicit about core name/message/stack
        // Order here intentional for serialization
        let ret = {
            name: error.name,
            message: error.message
        };
        Object.assign(ret, error);
        ret.stack = error.stack?.split(/\n/g);

        ret = omitBy(ret, isNil);

        // 2) Deep clone/protect against circularity/monstrosity
        ret = cloneAndTrim(ret);

        // 3) Additional ad-hoc cleanups
        // Remove noisy grails exception wrapper info
        // Remove verbose loadSpec from fetchOptions
        const {serverDetails} = ret;
        if (serverDetails?.className === 'GrailsCompressingFilter') {
            delete serverDetails.className;
            delete serverDetails.lineNumber;
        }

        const {fetchOptions} = ret;
        if (fetchOptions?.loadSpec) {
            fetchOptions.loadType = fetchOptions.loadSpec.typeDisplay;
            fetchOptions.loadNumber = fetchOptions.loadSpec.loadNumber;
            delete fetchOptions.loadSpec;
        }

        // 4) Stringify and cleanse
        return stripTags(JSON.stringify(ret, null, 4));

    } catch (e) {
        console.error('Could not convert error object to string:', error, e);
        return 'Unable to display error';
    }
}

// Create a depth-constrained, deep copy of an object for safe-use in stringify
//   - Skip private _XXXX properties.
//   - Don't touch objects that implement toJSON()
function cloneAndTrim(obj, depth = 5) {
    if (depth < 1) return null;

    const ret = {};
    forOwn(obj, (val, key) => {
        if (key.startsWith('_')) return;
        if (!val.toJSON) {
            if (isObject(val)) {
                val = depth > 1 ? cloneAndTrim(val, depth - 1) : '{...}';
            }
            if (isArray(val)) {
                val = depth > 1 ? val.map(it => cloneAndTrim(it, depth - 1)) : '[...]';
            }
        }
        ret[key] = val;
    });

    return ret;
}
