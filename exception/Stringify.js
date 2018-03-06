/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {trimToDepth} from 'hoist/utils/JsUtils';
import {stripTags} from 'hoist/utils/HtmlUtils';

/**
 * Stringify an error object (typically an exception) safely for
 * submission to server.
 *
 * This method will avoid circular references and will trim the depth of the stack.
 *
 * @param errorObject
 * @return string
 */
export function stringifyErrorSafely(errorObject) {
    try {
        let err = errorObject;

        // 1) Tweak/optimize format
        if (err.serverDetails && err.serverDetails.className === 'GrailsCompressingFilter') {
            // delete info that may be misleading
            delete err.serverDetails.className;
            delete err.serverDetails.lineNumber;
        }

        if (err.requestOptions) {
            delete err.requestOptions.mask;
            delete err.requestOptions.scope;

        }

        if (err.stack) {
            // Clean-up 'stack', and also add it last, which can be useful for stringify
            err.stackTrace = err.stack.split(/\n/g);
            delete err.stack;
        }

        // 2) Protect against circularity, monstrosity with a general depth trim
        err = trimToDepth(err, 5);

        return stripTags(JSON.stringify(err, null, 4));

    } catch (e) {
        console.error('Could not convert error object to string:', errorObject, e);
        return 'Unable to display error';
    }
}
