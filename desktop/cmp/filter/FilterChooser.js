/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {div, hframe} from '@xh/hoist/cmp/layout';
import {Select, select} from '@xh/hoist/desktop/cmp/input';

import './FilterChooser.scss';

/**
 * A Select based control for searching and choosing filters.
 * @see FilterChooserModel
 */
export const [FilterChooser, filterChooser] = hoistCmp.withFactory({
    model: uses(FilterChooserModel),
    className: 'xh-filter-chooser',
    render({model, className, ...rest}) {
        return select({
            className,
            bind: 'value',
            enableMulti: true,
            enableClear: true,
            queryFn: (q) => model.queryAsync(q),
            optionRenderer: (opt) => filterOption(opt),
            hideDropdownIndicator: true,
            rsOptions: {
                // Todo: Use defaultOptions to render history options?
                // e.g. defaultOptions: model.historyOptions,
                openMenuOnClick: false,
                openMenuOnFocus: false,
                isOptionDisabled: (opt) => opt.value === 'TRUNCATED-MESSAGE'
            },
            ...rest
        });
    }
});

const filterOption = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option',
    render({className, displayName, operator, displayValue}) {
        return hframe({
            className,
            items: [
                div({className: 'name', item: displayName}),
                div({className: 'operator', item: operator}),
                div({className: 'value', item: displayValue})
            ]
        });
    }
});

FilterChooser.propTypes = {
    ...Select.propTypes
};