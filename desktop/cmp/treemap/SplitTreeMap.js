/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {placeholder, fragment, hframe, vframe, hbox, vbox, box, div} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {compact, uniq} from 'lodash';
import PT from 'prop-types';

import './SplitTreeMap.scss';
import {SplitTreeMapModel} from './SplitTreeMapModel';
import {treeMap} from './TreeMap';

/**
 * A component which divides data across two TreeMaps.
 *
 * @see SplitTreeMapModel
 */
export const [SplitTreeMap, splitTreeMap]  = hoistCmp.withFactory({
    displayName: 'SplitTreeMap',
    model: uses(SplitTreeMapModel),
    className: 'xh-split-treemap',

    render({model, className, ...props}, ref) {
        const {primaryMapModel, secondaryMapModel, orientation} = model,
            errors = uniq(compact([primaryMapModel.error, secondaryMapModel.error])),
            container = orientation === 'horizontal' ? hframe : vframe;

        return container({
            ref,
            className,
            items: errors.length ? errorMessage({error: errors[0]}) : childMaps(),
            ...props
        });
    }
});

SplitTreeMap.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(SplitTreeMapModel), PT.object])
};

const childMaps = hoistCmp.factory(
    ({model}) => {
        const {primaryMapModel, secondaryMapModel, empty, emptyText, isMasking} = model;
        if (empty) return placeholder(emptyText);

        const pTotal = primaryMapModel.total,
            sTotal = secondaryMapModel.total;

        let pFlex = 1, sFlex = 1;
        if (pTotal && sTotal) {
            // pFlex value is rounded to limit the precision of our flex config and avoid extra
            // render cycles due to imperceptible changes in the ratio between the sides.
            pFlex = (pTotal / sTotal).toFixed(2);
        } else if (pTotal && !sTotal) {
            sFlex = 0;
        } else if (!pTotal && sTotal) {
            pFlex = 0;
        }

        return fragment([
            // Primary Map
            mapTitle({isPrimary: true}),
            box({
                omit: !pTotal,
                flex: pFlex,
                className: 'xh-split-treemap__map-holder',
                item: treeMap({model: primaryMapModel})
            }),

            // Secondary Map
            mapTitle({isPrimary: false}),
            box({
                omit: !sTotal,
                flex: sFlex,
                className: 'xh-split-treemap__map-holder',
                item: treeMap({model: secondaryMapModel})
            }),

            // Mask
            div({
                omit: !isMasking,
                className: 'xh-split-treemap__mask-holder',
                item: mask({isDisplayed: true, spinner: true})
            })
        ]);
    }
);

const mapTitle = hoistCmp.factory(
    ({model, isPrimary}) => {
        const {mapTitleFn, orientation} = model,
            treeMapModel = isPrimary ? model.primaryMapModel : model.secondaryMapModel;

        if (!mapTitleFn || !treeMapModel.total) return null;

        const container = orientation === 'vertical' ? hbox : vbox;
        return container({
            className: 'xh-split-treemap__header',
            item: div({
                className: 'xh-split-treemap__header__title',
                item: mapTitleFn(treeMapModel, isPrimary)
            })
        });
    }
);
