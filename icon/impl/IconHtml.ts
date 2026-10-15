/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    AbstractElement,
    findIconDefinition,
    icon,
    IconName,
    IconPrefix,
    toHtml
} from '@fortawesome/fontawesome-svg-core';
import classNames from 'classnames';
import {isString} from 'lodash';

/**
 * Get the raw HTML string for an icon's SVG tag.
 * @internal - apps should use the Hoist Icon factories instead with {@link IconProps.asHtml}.
 */
export function iconHtml({
    faName,
    prefix = 'far',
    title,
    className,
    size
}: {
    faName: IconName;
    prefix: IconPrefix;
    title?: string;
    className?: string;
    size?: string;
}) {
    const iconDef = findIconDefinition({prefix, iconName: faName}),
        classes = enhanceFaClasses(className, size);

    if (!title) return icon(iconDef, {classes}).html[0];

    // FontAwesome ignores `title`, so add the SVG `<title>` child the browser shows as a tooltip.
    const svg = icon(iconDef, {classes, attributes: {'aria-label': title}}).abstract[0];
    svg.children.unshift({
        tag: 'title',
        attributes: {},
        // svg-core types children as elements, but `toHtml` escapes and renders strings too.
        children: [title as unknown as AbstractElement]
    });
    return toHtml(svg);
}

export function enhanceFaClasses(className: string, size: string) {
    return classNames(className, 'xh-icon', isString(size) ? `fa-${size}` : null);
}
