import {defaults} from 'lodash';
import moment from 'moment';

const DATE_FMT = 'YYYY-=MM-DD',
    DATETIME_FMT = 'YYYY-MM-DD h:mma',
    TIME_FMT = 'h:mma';

/**
 * Wrap values in a custom span
 *
 * @param v - value to be place in span
 * opts - may include:
 *   @param cls - string for span class
 *   @param title - string for span title
 *   @param leadSpc - set to true to add a space before the v to be wrapped
 *   @param trailSpc - set to true to add a space after the span to be returned
 *
 */
export const span = function(v, {
    cls = null,
    title = null,
    leadSpc = false,
    trailSpc = false
} = {}) {

    if (v == null) return '';

    const txt = (leadSpc ? ' ' : '') + v;

    let ret = '<span';
    ret += cls ? ` class="${cls}"` : '';
    ret += title ? ` title="${title}"` : '';
    ret += `>${txt}</span>`;

    return trailSpc ? ret + ' ' : ret;
};

/**
 * Render dates and times with specified format
 *
 * @param v - date to format
 *                (new to react-hoist: accepts Dates, date strings, or millis, as well as other supported inputs,
 *                see momentJS docs for details)
 *
 * @param opts - Options object that may include
 *   @param fmt - Ext.Date format string
 *   @param tipFn - function, use to place formatted date in span with title property set to returned string
 *                            will be passed the originalValue param
 *
 *  For convenience opts may be provided as a an Ext.Date format string.
 */
export const date = function(v, opts = {}) {
    if (typeof opts == 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: DATE_FMT, tipFn: null});

    let ret = moment(v).format(opts.fmt); // invalid input will produce a 'Invalid Date' string. Do we want to short circuit this with an empty string?

    if (opts.tipFn) {
        ret = span(ret, {cls: 'xh-title-tip', title: opts.tipFn(opts.originalValue)});
    }

    return ret;
};

export const dateTime = function(v, opts = {}) {
    if (typeof opts == 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: DATETIME_FMT});

    return date(v, opts);
};


export const time = function(v, opts = {}) {
    if (typeof opts == 'string') opts = {fmt: opts};

    saveOriginal(v, opts);
    defaults(opts, {fmt: TIME_FMT});

    return date(v, opts);
};

export const dateRenderer = createRenderer(date);
export const dateTimeRenderer = createRenderer(dateTime);
export const timeRenderer = createRenderer(time);

/**
 * Generate a renderer.
 * Renderers return a given formatter function.
 *
 * Renderers take a config for its formatter method
 * If this config is an object it will be cloned before being passed to its formatter.
 * Cloning ensures that the formatter gets a clean config object each time it is called.
 *
 * To account for ag-grid behavior, renderers will check it's input for a value property before passing to formatter
 *
 * @param formatter - an existing method
 */
function createRenderer(formatter) {
    return function(config) {
        const isObj = (typeof config == 'object');
        return (v) => {
            const formatterConfig = isObj ? defaults({}, config) : config,
                val = v.value || v;
            return formatter(val, formatterConfig);
        };
    };
};

function saveOriginal(v, opts) {
    if (opts.originalValue === undefined) {
        opts.originalValue = v;
    }
};