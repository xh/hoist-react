/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {FacetChooserModel} from '@xh/hoist/cmp/facetchooser';
import {div, frame, hframe} from '@xh/hoist/cmp/layout';
import {Select, select} from '@xh/hoist/desktop/cmp/input';

import './FacetChooser.scss';

/**
 * A Select based control for searching and choosing a list of facets.
 * @see FacetChooserModel
 */
export const [FacetChooser, facetChooser] = hoistCmp.withFactory({
    model: uses(FacetChooserModel),
    className: 'xh-facet-chooser',
    render({model, className, ...rest}) {
        return select({
            className,
            bind: 'value',
            enableMulti: true,
            enableClear: true,
            queryFn: (q) => model.queryAsync(q),
            optionRenderer: (opt) => facetOption(opt),
            hideDropdownIndicator: true,
            rsOptions: {
                openMenuOnClick: false,
                openMenuOnFocus: false,
                isOptionDisabled: (opt) => opt.value === 'TRUNCATED-MESSAGE'
            },
            ...rest
        });
    }
});

const facetOption = hoistCmp.factory({
    model: false,
    className: 'xh-facet-chooser-option',
    render({className, displayName, displayValue, count}) {
        return hframe({
            className,
            items: [
                div({className: 'name', item: displayName}),
                frame({className: 'value', item: displayValue}),
                div({className: 'count', item: count})
            ]
        });
    }
});

FacetChooser.propTypes = {
    ...Select.propTypes
};