/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/core';
import {stripTags} from 'hoist/utils/HtmlUtils';

export class FeedbackService extends BaseService {

    /**
     * Create a feedback entry. Username, browser info, environment info, and datetime will be
     * recorded automatically by the server. Feedback entries are viewable via the Admin console,
     * and feedback submissions can trigger server-side notifications.
     * See FeedbackService.groovy within hoist-core for details.
     *
     * @param {Object} options
     * @param {string} options.msg - user-supplied message to POST.
     */
    async submitAsync(options) {
        await XH.fetchJson({
            url: 'hoistImpl/submitFeedback',
            params: {
                msg: stripTags(options.msg),
                appVersion: XH.getEnv('appVersion')
            }
        });
    }
}