/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {frame} from '@xh/hoist/cmp/layout';
import PT from 'prop-types';

import './LayoutContainer.scss';
import {LayoutContainerModel} from './LayoutContainerModel';

/**
 * Display a set of child components in accordance with a LayoutContainerModel.
 *
 * @see LayoutContainerModel
 */
export const [LayoutContainer, layoutContainer] = hoistCmp.withFactory({
    displayName: 'LayoutContainer',
    model: uses(LayoutContainerModel),
    className: 'xh-layout-container',

    render({model, className}) {
        return frame({
            className,
            ref: model.containerRef
        });
    }
});

LayoutContainer.propTypes = {
    model: PT.oneOfType([PT.instanceOf(LayoutContainerModel), PT.object])
};
