/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {stripTags} from '@xh/hoist/utils/HtmlUtils';

@HoistService()
export class FeedbackService {

    /**
     * Create a feedback entry. Username, browser info, environment info, and datetime will be
     * recorded automatically by the server. Feedback entries are viewable via the Admin console,
     * and feedback submissions can trigger server-side notifications.
     * See FeedbackService.groovy within hoist-core for details.
     *
     * @param {Object} options
     * @param {string} options.message - user-supplied message to POST.
     */
    async submitAsync({message}) {
        await XH.fetchJson({
            url: 'hoistImpl/submitFeedback',
            params: {
                msg: stripTags(message),
                appVersion: XH.getEnv('appVersion')
            }
        });
    }
}