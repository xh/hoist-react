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

        /** Function to render region titles. Receives region total, and region name ['primary', 'secondary']. */
        regionTitleRenderer: PT.func
    };

    static modelClass = SplitTreeMapModel;

    baseClassName = 'xh-split-treemap';

    render() {
        const {primaryRegionModel, secondaryRegionModel, primaryRegionTotal, secondaryRegionTotal, orientation} = this.model,
            {regionTitleRenderer} = this.props,
            container = orientation === 'horizontal' ? hframe : vframe;

        return container({
            className: this.getClassName(),
            items: [
                panel({
                    title: regionTitleRenderer ? regionTitleRenderer(primaryRegionTotal, 'primary') : undefined,
                    compactHeader: true,
                    flex: primaryRegionTotal,
                    item: treeMap({model: primaryRegionModel})
                }),
                panel({
                    title: regionTitleRenderer ? regionTitleRenderer(secondaryRegionTotal, 'secondary') : undefined,
                    compactHeader: true,
                    flex: secondaryRegionTotal,
                    item: treeMap({model: secondaryRegionModel})
                })
            ],
            ...this.getLayoutProps()
        });
    }

}

export const splitTreeMap = elemFactory(SplitTreeMap);