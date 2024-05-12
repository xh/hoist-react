/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {box, div, fragment, hbox, hframe, p, placeholder, vbox, vframe} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, uses, XH} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import '@xh/hoist/desktop/register';
import classNames from 'classnames';
import {compact, uniq} from 'lodash';
import {splitter} from './impl/Splitter';

import './SplitTreeMap.scss';
import {SplitTreeMapModel} from './SplitTreeMapModel';
import {treeMap} from './TreeMap';

export interface SplitTreeMapProps extends HoistProps<SplitTreeMapModel>, BoxProps {}

/**
 * A component which divides data across two TreeMaps.
 */
export const [SplitTreeMap, splitTreeMap] = hoistCmp.withFactory<SplitTreeMapProps>({
    displayName: 'SplitTreeMap',
    model: uses(SplitTreeMapModel),
    className: 'xh-split-treemap',

    render({model, className, testId, ...props}, ref) {
        const {primaryMapModel, secondaryMapModel, orientation} = model,
            errors = uniq(compact([primaryMapModel.error, secondaryMapModel.error])),
            container = orientation === 'horizontal' ? hframe : vframe;

        return container({
            testId,
            ref,
            className,
            items: errors.length ? errorPanel({errors}) : childMaps(),
            ...props
        });
    }
});

const childMaps = hoistCmp.factory<SplitTreeMapModel>(({model}) => {
    const {
        primaryMapModel,
        secondaryMapModel,
        empty,
        emptyText,
        isMasking,
        mapTitleFn,
        showSplitter
    } = model;
    if (empty) return placeholder(emptyText);

    const pTotal = primaryMapModel.total,
        sTotal = secondaryMapModel.total;

    let pFlex = 1,
        sFlex = 1;
    if (pTotal && sTotal) {
        // pFlex value is rounded to limit the precision of our flex config and avoid extra
        // render cycles due to imperceptible changes in the ratio between the sides.
        pFlex = parseFloat((pTotal / sTotal).toFixed(2));
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

        splitter({omit: !!mapTitleFn || !showSplitter}),

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
});

const mapTitle = hoistCmp.factory<SplitTreeMapModel>(({model, isPrimary}) => {
    const {mapTitleFn, orientation} = model,
        // Title orientation is perpendicular to overall orientation
        titleOrientation = orientation === 'vertical' ? 'horizontal' : 'vertical',
        treeMapModel = isPrimary ? model.primaryMapModel : model.secondaryMapModel;

    if (!mapTitleFn || !treeMapModel.total) return null;

    const container = titleOrientation === 'horizontal' ? hbox : vbox,
        dim = titleOrientation === 'horizontal' ? 'height' : 'width',
        size = (AgGrid as any).getHeaderHeightForSizingMode(XH.sizingMode);

    return container({
        style: {[dim]: `${size}px`},
        className: classNames(
            'xh-split-treemap__header',
            'xh-split-treemap__header--' + titleOrientation
        ),
        item: div({
            className: 'xh-split-treemap__header__title',
            item: mapTitleFn(treeMapModel, isPrimary)
        })
    });
});

const errorPanel = hoistCmp.factory(({errors}) =>
    errorMessage({error: errors.join(' '), message: fragment(errors.map(e => p(e)))})
);
