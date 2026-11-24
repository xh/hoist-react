/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {flattenDeep, isPlainObject} from 'lodash';
import {isValidElement} from 'react';
import type {ReactNode} from 'react';

/**
 * Throw in development mode if a component that takes its rows in an array prop, such as
 * `entries`, was given them as children instead.
 *
 * Rows passed as `children`, or as the legacy `items` alias, arrive as children that are plain
 * objects. The component would render nothing, with no hint of why. This names the prop to use
 * instead.
 *
 * @param children - the `children` prop of the component.
 * @param propName - the array prop the rows belong in, such as `entries`.
 * @param displayName - the name of the component, for the message.
 * @internal
 */
export function throwIfRowsPassedAsChildren(
    children: ReactNode,
    propName: string,
    displayName: string
) {
    if (!XH.isDevelopmentMode || children == null) return;
    const kids = flattenDeep([children]);
    if (kids.some(it => isPlainObject(it) && !isValidElement(it))) {
        throw XH.exception(
            `${displayName} takes its rows in '${propName}', not as 'children' or 'items', ` +
                `which render as child elements.`
        );
    }
}
