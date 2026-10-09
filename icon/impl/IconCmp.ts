/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {elementFactory, hoistCmp} from '@xh/hoist/core';
import {useLayoutEffect, useRef} from 'react';
import {enhanceFaClasses} from './IconHtml';

/**
 * Internal component for a FontAwesome Icon in Hoist.
 * Applications should use the factory methods on Icon instead.
 * @internal
 */
export const iconCmp = hoistCmp.factory({
    displayName: 'Icon',
    observer: false,
    model: false,

    render({faName, prefix, title, className, size, ...rest}) {
        const svgRef = useRef<SVGSVGElement>(null);

        // FontAwesome ignores `title`, so add the SVG `<title>` child the browser shows as a tooltip.
        useLayoutEffect(() => {
            const svg = svgRef.current;
            if (!svg || !title) return;
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleEl.textContent = title;
            svg.prepend(titleEl);
            return () => titleEl.remove();
        }, [title, faName, prefix]);

        className = enhanceFaClasses(className, size);
        return fontAwesomeIcon({
            icon: [prefix, faName],
            className,
            'aria-label': title,
            ...rest,
            ref: svgRef
        });
    }
});
const fontAwesomeIcon = elementFactory(FontAwesomeIcon);
