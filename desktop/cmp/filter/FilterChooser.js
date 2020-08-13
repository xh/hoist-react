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
            hideDropdownIndicator: true,
            queryFn: (q) => model.queryAsync(q),
            options,
            optionRenderer,
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

FilterChooser.propTypes = {
    ...Select.propTypes
};


//-----------------
// Implementation
//------------------
function optionRenderer(opt) {
    if (opt.isHistory) return historyOption({labels: opt.labels});
    if (opt.isSuggestion) return suggestionOption(opt);
    if (opt.value === FilterChooserModel.TRUNCATED) return truncatedMessage(opt);
    return filterOption(opt);
}

const filterOption = hoistCmp.factory({
    model: false, observer: false,
    render({displayName, op, displayValue}) {
        return hframe({
            className: 'xh-filter-chooser-option',
            items: [
                div({className: 'name', item: displayName}),
                div({className: 'operator', item: op}),
                div({className: 'value', item: displayValue})
            ]
        });
    }
});

const historyOption = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({labels}) {
        return hframe({
            className: 'xh-filter-chooser-option__history',
            item: labels?.map(label => historyOptionTag({label}))
        });
    }
});

const historyOptionTag = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({label}) {
        return div({
            className: 'xh-filter-chooser-option__history-tag',
            item: label
        });
    }
});

const suggestionOption = hoistCmp.factory({
    model: false, observer: false, memo: false,
    render({spec}) {
        const {displayName, ops, example} = spec;
        return hframe({
            className: 'xh-filter-chooser-option__suggestion',
            items: [
                div('e.g.'),
                div({className: 'name', item: displayName}),
                div({className: 'operators', item: '[ ' + ops.join(', ') + ' ]'}),
                div({className: 'example', item: example})
            ]
        });
    }
});

const truncatedMessage = hoistCmp.factory({
    model: false, observer: false,
    render({truncateCount}) {
        return hframe({
            className: 'xh-filter-chooser-option__truncated',
            item: `${fmtNumber(truncateCount)} results truncated`
        });
    }
});
