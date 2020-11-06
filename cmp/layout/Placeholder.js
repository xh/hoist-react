/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {box} from '@xh/hoist/cmp/layout';

import './Placeholder.scss';

export const [Placeholder, placeholder] = hoistCmp.withFactory({
    displayName: 'Placeholder',
    model: false, memo: false, observer: false,
    className: 'xh-placeholder',

    render(props) {
        return box(props);
    }
});