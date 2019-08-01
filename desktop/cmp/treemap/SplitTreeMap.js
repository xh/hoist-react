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
 * A component which divides data across two TreeMaps.
 *
 * @see SplitTreeMapModel
 */
@HoistComponent
@LayoutSupport
export class SplitTreeMap extends Component {

    static propTypes = {
        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(SplitTreeMapModel), PT.object]).isRequired
    };

    static modelClass = SplitTreeMapModel;

    baseClassName = 'xh-split-treemap';

    render() {
        const {model} = this,
            {
                primaryMapModel,
                primaryMapTotal,
                secondaryMapModel,
                secondaryMapTotal,
                mapTitleFn,
                orientation
            } = model,
            container = orientation === 'horizontal' ? hframe : vframe,
            primaryFlex = primaryMapTotal > 0 && secondaryMapTotal > 0 ? (primaryMapTotal / secondaryMapTotal) : 1;

        return container({
            className: this.getClassName(),
            items: [
                panel({
                    title: mapTitleFn ? mapTitleFn('primary', model) : undefined,
                    compactHeader: true,
                    flex: primaryFlex,
                    item: treeMap({model: primaryMapModel})
                }),
                panel({
                    title: mapTitleFn ? mapTitleFn('secondary', model) : undefined,
                    compactHeader: true,
                    flex: 1,
                    item: treeMap({model: secondaryMapModel})
                })
            ],
            ...this.getLayoutProps()
        });
    }

}

export const splitTreeMap = elemFactory(SplitTreeMap);