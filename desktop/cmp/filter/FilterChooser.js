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
import {fmtNumber} from '@xh/hoist/format';

import './FilterChooser.scss';

/**
 * A Select based control for searching and choosing filters.
 * @see FilterChooserModel
 */
export const [FilterChooser, filterChooser] = hoistCmp.withFactory({
    model: uses(FilterChooserModel),
    className: 'xh-filter-chooser',
    render({model, className, ...rest}) {
        const {inputRef, options, historyOptions, hasHistory} = model;
        return select({
            className,
            bind: 'value',
            ref: inputRef,
            enableMulti: true,
            enableClear: true,
            queryFn: (q) => model.queryAsync(q),
            optionRenderer: (opt) => getFilterOption(opt),
            hideDropdownIndicator: true,
            options: options,
            rsOptions: {
                defaultOptions: historyOptions,
                openMenuOnClick: hasHistory,
                openMenuOnFocus: hasHistory,
                isOptionDisabled: (opt) => opt.value === FilterChooserModel.TRUNCATED,
                styles: {
                    menuList: (base) => ({...base, maxHeight: 'unset'})
                }
            },
            ...rest
        });
    }
});

function getFilterOption(opt) {
    if (opt.isHistory) return historyOption({labels: opt.labels});
    if (opt.isSuggestion) return suggestionOption(opt);
    if (opt.value === FilterChooserModel.TRUNCATED) return truncatedMessage(opt);
    return filterOption(opt);
}

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

const historyOption = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option__history',
    render({className, labels}) {
        return hframe({
            className,
            item: labels?.map(label => historyOptionTag({label}))
        });
    }
});

const historyOptionTag = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option__history-tag',
    render({className, label}) {
        return div({className, item: label});
    }
});

const suggestionOption = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option__suggestion',
    render({className, spec}) {
        const {displayName, operators, example} = spec;
        return hframe({
            className,
            items: [
                div('e.g.'),
                div({className: 'name', item: displayName}),
                div({className: 'operators', item: '[ ' + operators.join(', ') + ' ]'}),
                div({className: 'example', item: example})
            ]
        });
    }
});

const truncatedMessage = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option__truncated',
    render({className, truncateCount}) {
        return hframe({
            className,
            item: `${fmtNumber(truncateCount)} results truncated`
        });
    }
});

FilterChooser.propTypes = {
    ...Select.propTypes
};