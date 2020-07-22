/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {div, hframe, hbox} from '@xh/hoist/cmp/layout';
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
        return select({
            className,
            bind: 'value',
            enableMulti: true,
            enableClear: true,
            queryFn: (q) => model.queryAsync(q),
            optionRenderer: (opt) => getFilterOption(opt),
            hideDropdownIndicator: true,
            options: model.options,
            rsOptions: {
                // Todo: Use defaultOptions to render history options?
                // e.g. defaultOptions: model.historyOptions,
                openMenuOnClick: false,
                openMenuOnFocus: false,
                isOptionDisabled: (opt) => {
                    return [
                        FilterChooserModel.TRUNCATED,
                        FilterChooserModel.SUGGESTIONS
                    ].includes(opt.value);
                },
                styles: {
                    menuList: (base) => ({...base, maxHeight: 'unset'})
                }
            },
            ...rest
        });
    }
});

function getFilterOption(opt) {
    switch (opt.value) {
        case FilterChooserModel.TRUNCATED:
            return truncatedMessage(opt);
        case FilterChooserModel.SUGGESTIONS:
            return suggestionMessage(opt);
        default:
            return filterOption(opt);
    }
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

const suggestionMessage = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option__suggestions',
    render({className, suggestions}) {
        return div({
            className,
            items: suggestions.map(spec => suggestionRow({spec}))
        });
    }
});

const suggestionRow = hoistCmp.factory({
    model: false,
    className: 'xh-filter-chooser-option__suggestion-row',
    render({className, spec}) {
        const {displayName, operators, example, fieldType} = spec;
        return hbox({
            className,
            items: [
                div('e.g.'),
                div({className: 'name', item: displayName}),
                div({className: 'operators', item: '( ' + operators.join(', ') + ' )'}),
                div({className: 'example', item: example ?? fieldType.toUpperCase()})
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