/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {elementFactory, hoistCmp} from '@xh/hoist/core';
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
        className = enhanceFaClasses(className, size);
        return fontAwesomeIcon({icon: [prefix, faName], className, title, ...rest});
    }
});
const fontAwesomeIcon = elementFactory(FontAwesomeIcon);
