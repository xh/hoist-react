/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import React, {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {hframe, vframe, frame} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {compact, uniq} from 'lodash';

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
            {primaryMapModel, secondaryMapModel, orientation} = model,
            errors = uniq(compact([primaryMapModel.error, secondaryMapModel.error])),
            container = orientation === 'horizontal' ? hframe : vframe;

        return container({
            className: this.getClassName(),
            items: errors.length ? this.renderErrors(errors) : this.renderChildMaps(),
            ...this.getLayoutProps()
        });
    }

    renderChildMaps() {
        const {model} = this,
            {primaryMapModel, secondaryMapModel, mapTitleFn} = model,
            pTotal = primaryMapModel.total,
            sTotal = secondaryMapModel.total;

        let pFlex = 1, sFlex = 1;
        if (pTotal && sTotal) {
            pFlex = (pTotal / sTotal).toFixed(2);
        } else if (pTotal && !sTotal) {
            sFlex = 0;
        } else if (!pTotal && sTotal) {
            pFlex = 0;
        }

        return [
            panel({
                title: mapTitleFn ? mapTitleFn('primary', primaryMapModel) : undefined,
                compactHeader: true,
                item: treeMap({model: primaryMapModel}),
                flex: pFlex
            }),
            panel({
                title: mapTitleFn ? mapTitleFn('secondary', secondaryMapModel) : undefined,
                compactHeader: true,
                item: treeMap({model: secondaryMapModel}),
                flex: sFlex
            })
        ];
    }

    renderErrors(errors) {
        return frame({
            className: 'xh-split-treemap__error-message',
            items: errors.map(e => <p>{e}</p>)
        });
    }

}

export const splitTreeMap = elemFactory(SplitTreeMap);