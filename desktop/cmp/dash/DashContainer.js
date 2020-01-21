/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {ModelLookupContext} from '@xh/hoist/core/impl';
import {frame} from '@xh/hoist/cmp/layout';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {useOnMount, useOnResize} from '@xh/hoist/utils/react';
import {useContext} from 'react';
import PT from 'prop-types';

import {DashContainerModel} from './DashContainerModel';

/**
 * Display a set of child components in accordance with a DashContainerModel.
 *
 * @see DashContainerModel
 */
export const [DashContainer, dashContainer] = hoistCmp.withFactory({
    displayName: 'DashContainer',
    model: uses(DashContainerModel),
    className: 'xh-dash-container',

    render({model, className}) {
        // Store current ModelLookupContext in model, to be applied in views later
        const modelLookupContext = useContext(ModelLookupContext);
        useOnMount(() => model.setModelLookupContext(modelLookupContext));

        // Get container ref for GoldenLayout resize handling
        const ref = useOnResize(() => model.onResize(), 100, model.containerRef);

        return frame(
            frame({className, ref}),
            mask({spinner: true, model: model.loadingStateTask})
        );
    }
});

DashContainer.propTypes = {
    model: PT.oneOfType([PT.instanceOf(DashContainerModel), PT.object])
};
