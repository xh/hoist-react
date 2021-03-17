/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {frame, box, placeholder} from '@xh/hoist/cmp/layout';
import {useOnResize, elementFromContent} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import composeRefs from '@seznam/compose-react-refs';
import PT from 'prop-types';

import './TilingContainer.scss';
import {TilingContainerModel} from './TilingContainerModel';

/**
 * Display a set of child components in accordance with a TilingContainerModel's layout.
 *
 * @see TilingContainerModel
 */
export const [TilingContainer, tilingContainer] = hoistCmp.withFactory({
    displayName: 'TilingContainer',
    model: uses(TilingContainerModel),
    className: 'xh-tiling-container',

    render({model, className}, ref) {
        ref = composeRefs(
            ref,
            useOnResize(dimensions => model.onResize(dimensions), {debounce: 100})
        );

        const {data, emptyText} = model;
        if (isEmpty(data)) {
            return placeholder(emptyText);
        }

        return frame({
            ref,
            className,
            items: data.map((data, idx) => tile({data, idx}))
        });
    }
});

TilingContainer.propTypes = {
    model: PT.oneOfType([PT.instanceOf(TilingContainerModel), PT.object])
};

const tile = hoistCmp.factory(
    ({model, data, idx}) => {
        if (!model.layout) return null;
        const style = model.getTileStyle(idx);
        return box({
            style,
            className: 'xh-tiling-container__tile',
            item: elementFromContent(model.content, {data})
        });
    }
);