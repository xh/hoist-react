/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist';
import {stripTags} from 'hoist/utils/HtmlUtils';

export class FeedbackService extends BaseService {

    /**
     * Create a feedback entry. Username, browser info, environment info, and datetime will be set automatically.
     * @param options - Map with msg & stack - both optional, although at least one should be provided!
     */
    async submitAsync({msg, stack} = {}) {
        await XH.fetchJson({
            url: 'hoistImpl/submitFeedback',
            params: {
                msg: msg ? stripTags(msg) : '[No message provided]',
                stack: stack ? stripTags(stack) : null
            }
        });
    }
}