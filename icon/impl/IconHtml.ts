/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {findIconDefinition, icon, IconName, IconPrefix} from '@fortawesome/fontawesome-svg-core';
import classNames from 'classnames';
import {isString} from 'lodash';

/**
 * Get the raw HTML string for an icon's SVG tag.
 * @internal - apps should use the Hoist Icon factories instead with {@link IconProps.asHtml}.
 */
export function iconHtml({
    iconName,
    prefix = 'far',
    title,
    className,
    size
}: {
    iconName: IconName;
    prefix: IconPrefix;
    title?: string;
    className?: string;
    size?: string;
}) {
    const iconDef = findIconDefinition({prefix, iconName}),
        classes = enhanceFaClasses(className, size);

    return icon(iconDef, {classes, title}).html[0];
}

export function enhanceFaClasses(className: string, size: string) {
    return classNames(className, 'fa-fw', 'xh-icon', isString(size) ? `fa-${size}` : null);
}
