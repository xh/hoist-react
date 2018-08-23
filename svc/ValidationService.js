import {HoistService} from '@xh/hoist/core';
import {validate} from 'validate.js/validate.js';
import moment from 'moment';
import {DATE_FMT, DATETIME_FMT} from '@xh/hoist/format';

/**
 * Handles any initial configuration of validate.js
 */
@HoistService()
export class ValidationService {
    async initAsync() {
        validate.Promise = Promise;

        // We need to setup the date parse and format in the validator
        validate.extend(validate.validators.datetime, {
            // The value is guaranteed not to be null or undefined but otherwise it could be anything.
            parse: (value, options) => {
                if (options.dateOnly) {
                    return +moment.utc(value).startOf('day');
                }

                return +moment.utc(value);
            },
            // Input is a unix timestamp
            format: (value, options) => {
                const format = options.dateOnly ? DATE_FMT : DATETIME_FMT;
                return moment.utc(value).format(format);
            }
        });
    }
}