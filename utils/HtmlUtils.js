/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {renderToStaticMarkup} from 'react-dom/server';

/**
 * Convert the passed URL into an absolute path relative to the server.
 * Will be returned as-is if already absolute / external.
 */
export function appUrl(url) {
    if (url != null && !url.startsWith('/') && !url.includes('//')) {
        url = XH.baseUrl + url;
    }
    return url;
}

/**
 * Strip HTML tags from a source text.
 */
export function stripTags(value) {
    return !value ? value : String(value).replace(/<\/?[^>]+>/gi, '');
}

/**
 * Convert a React element to html markup
 */
export function toHtml(el) {
    return renderToStaticMarkup(el);
}