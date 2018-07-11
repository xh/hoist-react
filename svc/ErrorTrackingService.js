/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistService} from '@xh/hoist/core';
import {stripTags} from '@xh/hoist/utils/HtmlUtils';
import {stringifyErrorSafely} from '@xh/hoist/exception';

@HoistService()
export class ErrorTrackingService {

    /**
     * Create a Client Exception entry. Client metadata will be set automatically.
     * App version is POSTed to reflect the version the client is running (vs the version on the server)
     * @param {Object} [options] - an options object:
     * @param {string} [options.message] - the message the user has written when deliberately sending in the error (optional)
     * @param {string} [options.exception] - an instance of the Javascript Error object.  Not strictly required, but hard to see when it would be omitted.
     * @param {boolean} [options.userAlerted] - flag to track whether the user was shown an alert detailing the error (optional)
     */
    async submitAsync({message, exception, userAlerted}) {

        // Fail somewhat silently to avoid letting problems here mask/confuse the underlying problem.
        try {
            const error = exception ? stringifyErrorSafely(exception) : null;

            await XH.fetchJson({
                url: 'hoistImpl/submitError',
                params: {
                    error,
                    msg: message ? stripTags(message) : '',
                    appVersion: XH.getEnv('appVersion'),
                    userAlerted,
                    clientUsername: XH.getUsername()
                }
            });
        } catch (e) {
            console.error('Failed sending error to server:', e);
        }
    }
}
