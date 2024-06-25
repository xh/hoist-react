/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Intent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {isNil} from 'lodash';
import {ReactNode} from 'react';

/**
 * Renderer for boolean values that displays a solid "checked" checkbox for true and a corresponding
 * empty checkbox square for false. When created with `displayUnsetState: true`, will render null
 * values in a third state with a solid square and a minus icon: `[-]`.
 *
 * These icons are very close to the look of the `checkbox` input, making this renderer a great
 * choice for inline-editable boolean columns.
 */
export function checkboxRenderer({
    displayUnsetState = false,
    intent = 'primary'
}: {
    displayUnsetState?: boolean;
    intent?: Intent;
}): (v: boolean) => ReactNode {
    return v => {
        const size = 'lg';

        if (v === true) return Icon.checkSquare({prefix: 'fas', intent, size});
        if (isNil(v) && displayUnsetState) return Icon.squareMinus({prefix: 'fas', intent, size});
        return Icon.square({prefix: 'fal', size});
    };
}
