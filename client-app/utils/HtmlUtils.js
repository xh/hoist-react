/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist';

/**
 * Convert the passed URL into an absolute path relative to the server.
 * Will be returned as-is if already absolute / external.
 */
export function appUrl(url) {
    if (url != null && !url.startsWith('/') && !url.includes('//')) {
        url = XH.BASE_URL + url;
    }
    return url;
}

/**
 * Return an HTML link tag with config.text as the link text.
 * The config.url is ensured to be absolute and any other params are installed on the tag.
 */
export function linkTag(config) {
    const url = appUrl(config.url),
        text = config.text || url;

    let tag = '<a href="' + url + '" ';

    for (const ky in config) {
        if (ky !== 'url' && ky !== 'text') {
            tag += (ky + '="' + config[ky] + '" ');
        }
    }

    tag += '>' + text + '</a>';
    return tag;
}

/**
 * Return an HTML image tag.
 * The config.url is ensured to be absolute and any other params are installed on the tag.
 */
export function imgTag(config) {
    const url = appUrl(config.url);

    let tag = '<img src="' + url + '" ';
    for (const ky in config) {
        if (ky !== 'url') {
            tag += (ky + '="' + config[ky] + '" ');
        }
    }
    tag += '>';
    return tag;
}

/**
 * Strip HTML tags from a source text.
 */
export function stripTags(value) {
    return !value ? value : String(value).replace(/<\/?[^>]+>/gi, '');
}
