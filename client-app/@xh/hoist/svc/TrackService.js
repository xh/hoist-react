/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/app';
import {stripTags} from 'hoist/utils/HtmlUtils';

export class TrackService extends BaseService {

    track(options) {
        const params = {msg: stripTags(typeof options === 'string' ? options : options.msg)};
        try {
            if (options.category)               params.category = options.category;
            if (options.data)                   params.data = JSON.stringify(options.data);
            if (options.elapsed !== undefined)  params.elapsed = options.elapsed;
            if (options.severity)               params.severity = options.severity;

            const consoleMsg =
                [params.category, params.msg, params.elapsed]
                    .filter(it => it != null)
                    .join(' | ');

            const exception = options.exception;
            if (exception) {
                const exceptionMsg = exception.msg || exception.message || 'Unknown exception';
                params.msg += ' | Error: ' + stripTags(exceptionMsg);
                if (!params.severity) params.severity = 'ERROR';
                console.error(consoleMsg, exception);
            } else {
                console.log(consoleMsg);
            }
            XH.fetchJson({
                url: 'hoistImpl/track',
                params: params
            });
        } catch (e) {
            console.error('Failure tracking message: ' + params.msg);
        }
    }
}
