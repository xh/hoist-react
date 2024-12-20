/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {div, fragment, p} from '@xh/hoist/cmp/layout';
import {SplitTreeMapModel} from '@xh/hoist/cmp/treemap';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import '@xh/hoist/desktop/register';
import {compact, uniq} from 'lodash';
import {ReactNode} from 'react';

/**
 * Desktop Implementation of SplitTreeMap.
 * @internal
 */
export function splitTreeMapImpl(model: SplitTreeMapModel, childMaps: ReactNode) {
    const {primaryMapModel, secondaryMapModel} = model,
        errors = uniq(compact([primaryMapModel.error, secondaryMapModel.error]));

    if (errors.length) {
        return errorPanel({errors});
    }

    return fragment(
        childMaps,
        div({
            omit: !model.isMasking,
            className: 'xh-split-treemap__mask-holder',
            item: mask({isDisplayed: true, spinner: true})
        })
    );
}

const errorPanel = hoistCmp.factory(({errors}) =>
    errorMessage({error: errors.join(' '), message: fragment(errors.map(e => p(e)))})
);
