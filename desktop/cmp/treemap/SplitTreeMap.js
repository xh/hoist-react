/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {hframe, vframe} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';

import {treeMap} from './TreeMap';
import {SplitTreeMapModel} from './SplitTreeMapModel';

/**
 * Todo
 */
@HoistComponent
@LayoutSupport
export class SplitTreeMap extends Component {

    static propTypes = {
        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(SplitTreeMapModel), PT.object]).isRequired,

        /** Function to render section titles. Receives section total, and section ['positive', 'negative']. */
        titleRenderer: PT.func
    };

    static modelClass = SplitTreeMapModel;

    baseClassName = 'xh-split-treemap';

    render() {
        const {posModel, negModel, orientation, posRootTotal, negRootTotal} = this.model,
            {titleRenderer} = this.props,
            container = orientation === 'horizontal' ? hframe : vframe;

        return container({
            className: this.getClassName(),
            items: [
                panel({
                    title: titleRenderer ? titleRenderer(posRootTotal, 'positive') : undefined,
                    compactHeader: true,
                    flex: posRootTotal,
                    item: treeMap({model: posModel})
                }),
                panel({
                    title: titleRenderer ? titleRenderer(negRootTotal, 'negative') : undefined,
                    compactHeader: true,
                    flex: negRootTotal,
                    item: treeMap({model: negModel})
                })
            ],
            ...this.getLayoutProps()
        });
    }

}

export const splitTreeMap = elemFactory(SplitTreeMap);