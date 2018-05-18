import {capitalize} from 'lodash';
import {span} from 'hoist/cmp/layout';

/**
 * Basic util for splitting a string (via ' ') and capitalizing each word - e.g. for names.
 * Not intended to handle more advanced usages such as HTML or other word boundary characters.
 * @param {string} str
 */
export function capitalizeWords(str) {
    if (str == null || !str.length) return str;
    return str.split(' ')
        .map(s => capitalize(s))
        .join(' ');
}

/**
 * Wrap values in a custom span
 *
 * @param {*} v - value to be placed in span, will be coerced into a string
 * @param {Object} [opts] - an options object:
 * @param {string} [opts.cls] - span class
 * @param {string} [opts.title] - span title
 * @param {boolean} [opts.leadSpc] - set to true to add a space before the v to be wrapped
 * @param {boolean} [opts.trailSpc] - set to true to add a space after the span to be returned
 * @param {boolean} [opts.asElement] - return a react element rather than a html string
 */
export function fmtSpan(v, {
    cls = null,
    title = null,
    leadSpc = false,
    trailSpc = false,
    asElement = false
} = {}) {
    if (v == null) return '';
    const opts = {cls, title, leadSpc, trailSpc};
    return asElement ? fmtSpanElement(v, opts) : fmtSpanHtml(v, opts);
}

//-----------------
// Implementation
//-----------------
function fmtSpanElement(v, opts = {}) {
    const {cls, title, leadSpc, trailSpc} = opts,
        txt = (leadSpc ? ' ' : '') + v + (trailSpc ? ' ' : '');

    return span({
        cls: cls,
        title: title,
        item: txt
    });
}

function fmtSpanHtml(v, opts = {}) {
    const {cls, title, leadSpc, trailSpc} = opts,
        txt = (leadSpc ? ' ' : '') + v;

    let ret = '<span';
    ret += cls ? ` class="${cls}"` : '';
    ret += title ? ` title="${title}"` : '';
    ret += `>${txt}</span>`;

    return trailSpc ? ret + ' ' : ret;
}