/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';

import {SplitTreeMapModel} from '../SplitTreeMapModel';
import './Splitter.scss';

/**
 * @internal
 */
export const splitter = hoistCmp.factory({
    displayName: 'TreeMap Splitter',
    model: uses(SplitTreeMapModel),

    render({model}) {
        const {orientation} = model,
            vertical = orientation === 'vertical',
            cmp = vertical ? hbox : vbox,
            cfg = {className: `xh-treemap-splitter ${vertical ? 'vertical' : 'horizontal'}`};

        return cmp(cfg);
    }
});
