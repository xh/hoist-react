/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ReactNode} from 'react';
import {Icon, IconProps} from '@xh/hoist/icon';

/**
 * Renderer for boolean values, displaying a solid blue square with checkmark icon for true values
 * and an empty square for false.
 * These icons are very close to the look of the browser native checkbox input.
 * Use on editable columns that use booleanEditor.
 */
export function checkboxRenderer(v): ReactNode {
    const conf: IconProps = !v
        ? {iconName: 'square', prefix: 'fal', intent: null, size: 'lg'}
        : {iconName: 'check-square', prefix: 'fas', intent: 'primary', size: 'lg'};

    return Icon.icon(conf);
}
