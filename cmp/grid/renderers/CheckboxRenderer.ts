/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ReactNode} from 'react';
import {Icon} from '@xh/hoist/icon';
import {isNil} from 'lodash';

/**
 * Renderer for boolean values, displaying:
 * a solid blue square with checkmark icon for true values
 * an empty square for false,
 * and, optionally, a solid blue square with a minus icon for null or undefined (unset state).
 * These icons are very close to the look of the Hoist-React checkbox input.
 *
 * Suggested use: on editable columns that use booleanEditor.
 */
export function checkboxRenderer(displayUnsetState = false): (v: boolean) => ReactNode {
    return v => {
        const size = 'lg',
            intent = 'primary';

        if (v === true) return Icon.checkSquare({prefix: 'fas', intent, size});
        if (isNil(v) && displayUnsetState) return Icon.squareMinus({prefix: 'fas', intent, size});
        return Icon.square({prefix: 'fal', size});
    };
}
