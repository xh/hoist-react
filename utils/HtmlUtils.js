/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {renderToStaticMarkup} from 'react-dom/server';

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