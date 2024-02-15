/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {findIconDefinition, icon} from '@fortawesome/fontawesome-svg-core';
import classNames from 'classnames';
import {isString} from 'lodash';

/**
 * Get the raw text of an SVG tag for an icon
 * Applications should use the factory methods on Icon instead.
 * @internal
 */
export function iconHtml({iconName, prefix, title, className, size}) {
    const iconDef = findIconDefinition({prefix, iconName}),
        classes = enhanceFaClasses(className, size);

    return icon(iconDef, {classes, title}).html[0];
}

export function enhanceFaClasses(className: string, size: string) {
    let ret = classNames(className, 'fa-fw', 'xh-icon');
    if (isString(size)) {
        ret = classNames(ret, `fa-${size}`);
    }
    return ret;
}
