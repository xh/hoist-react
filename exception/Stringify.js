/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {stripTags, trimToDepth} from '@xh/hoist/utils/js';

/**
 * Stringify an error object (typically an exception) safely for submission to server.
 * This method will avoid circular references and will trim the depth of the stack.
 *
 * @param {Object} errorObject - the error to serialize
 * @return string
 */
export function stringifyErrorSafely(errorObject) {
    try {
        // Clone + protect against circularity, monstrosity with a general depth trim.
        const err = trimToDepth(errorObject, 5);

        // Delete noisy grails exception
        const {serverDetails} = err;
        if (serverDetails?.className === 'GrailsCompressingFilter') {
            delete serverDetails.className;
            delete serverDetails.lineNumber;
        }

        // Remove verbose loadSpec from fetchOptions
        const {fetchOptions} = err;
        if (fetchOptions?.loadSpec) {
            fetchOptions.loadType = fetchOptions.loadSpec.typeDisplay;
            fetchOptions.loadNumber = fetchOptions.loadSpec.loadNumber;
            delete fetchOptions.loadSpec;
        }

        // Clean-up 'stack', and also add it last, which can be useful for stringify
        const {stack} = err;
        if (stack) {
            err.stackTrace = stack.split(/\n/g);
            delete err.stack;
        }

        return stripTags(JSON.stringify(err, null, 4));
    } catch (e) {
        console.error('Could not convert error object to string:', errorObject, e);
        return 'Unable to display error';
    }
}
