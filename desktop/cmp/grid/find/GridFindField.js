/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel, useLocalModel} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {hbox, span} from '@xh/hoist/cmp/layout';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import './GridFindField.scss';
import {GridFindFieldModel} from './GridFindFieldModel';

/**
 * A text input Component that enables users to search through a Grid and select rows that match
 * the entered search term based on simple word-boundary matching of its value to the value of
 * configured fields on a record. If any field values match, the record itself is considered a match.
 *
 * This component is designed to be bound to a GridModel via `gridModel` prop. (If not configured to
 * bind to a specific GridModel, this component will bind by default to the nearest GridModel found
 * in context.) Binding in this way allows the component to auto-generate the fields in the store to
 * be searched by the field and to automatically select the results in the Grid.
 *
 * Fields to be searched can be automatically determined from the bound Grid's Store, and/or
 * customized via the include/excludeFields props. See prop comments for details.
 *
 * This component supports all props available to TextInput and will pass them along to its
 * underlying TextInput.
 */
export const [GridFindField, gridFindField] = hoistCmp.withFactory({
    displayName: 'GridFindField',
    className: 'xh-grid-find-field',
    model: null,
    render(props) {
        let [layoutProps, {gridModel, className, ...restProps}] = splitLayoutProps(props);

        gridModel = withDefault(gridModel, useContextModel(GridModel));
        errorIf(
            !gridModel || !gridModel.selModel?.isEnabled,
            'GridFindField must be bound to GridModel with an enabled StoreSelectionModel.'
        );

        const impl = useLocalModel(() => new GridFindFieldModel({gridModel, ...props}));
        impl.updateProps(props);

        const {countLabel, hasResults} = impl;
        return hbox({
            width: 220,
            className,
            ...layoutProps,
            items: [
                textInput({
                    model: impl,
                    bind: 'query',
                    commitOnChange: true,
                    leftIcon: Icon.search(),
                    enableClear: true,
                    placeholder: 'Find',
                    width: null,
                    flex: 1,
                    onKeyDown: (ev) => {
                        if (ev.key === 'Enter') {
                            ev.shiftKey ? impl.selectPrev() : impl.selectNext();
                        }
                    },
                    ...restProps
                }),
                hbox({
                    className: 'xh-grid-find-field__controls',
                    items: [
                        span({
                            omit: !countLabel,
                            className: 'xh-grid-find-field__count-label',
                            item: countLabel
                        }),
                        button({
                            disabled: !hasResults,
                            icon: Icon.chevronUp(),
                            onClick: () => impl.selectPrev()
                        }),
                        button({
                            disabled: !hasResults,
                            icon: Icon.chevronDown(),
                            onClick: () => impl.selectNext()
                        })
                    ]
                })
            ]
        });
    }
});

GridFindField.propTypes = {
    /**
     * GridModel whose data this control should search. This component will, by default, use the
     * fields for all *visible* columns when matching, as well as any groupBy field.
     */
    gridModel: PT.instanceOf(GridModel),


    /** Mode to use when searching (default 'startWord'). */
    matchMode: PT.oneOf(['start', 'startWord', 'any']),

    /**
     * Delay (in ms) to buffer searching the grid after the value changes from user input.
     * Default 200ms. Set to 0 to filter immediately on each keystroke.
     */
    queryBuffer: PT.number,

    /**
     * Names of field(s) to include in search. Cannot be used with `excludeFields`.
     */
    includeFields: PT.arrayOf(PT.string),

    /** Names of field(s) to exclude from search. Cannot be used with `includeFields`. */
    excludeFields: PT.arrayOf(PT.string)
};
