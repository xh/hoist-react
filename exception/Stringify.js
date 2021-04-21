/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {stripTags, trimToDepth} from '@xh/hoist/utils/js';
import {omitBy, isNil} from 'lodash';

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

        // 2) Some ad-hod cleanups
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

        // 3) Protect against circularity, monstrosity with a general depth trim.
        ret = trimToDepth(ret, 5);

        return stripTags(JSON.stringify(ret, null, 4));
    } catch (e) {
        console.error('Could not convert error object to string:', error, e);
        return 'Unable to display error';
    }
}
