/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/app';
import {stripTags} from 'hoist/utils/HtmlUtils';

export class FeedbackService extends BaseService {

    /**
     * Create a feedback entry. Username, browser info, environment info, and datetime will be set automatically.
     * @param options - Map with msg.
     */
    async submitAsync({msg} = {}) {
        await XH.fetchJson({
            url: 'hoistImpl/submitFeedback',
            params: {
                msg: stripTags(msg),
                appVersion: XH.getEnv('appVersion')
            }
        });
    }
}