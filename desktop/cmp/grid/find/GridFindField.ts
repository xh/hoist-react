/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, LayoutProps, useLocalModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput, TextInputProps} from '@xh/hoist/desktop/cmp/input';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {consumeEvent} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import './GridFindField.scss';
import {GridFindFieldImplModel} from './impl/GridFindFieldImplModel';

export interface GridFindFieldProps extends TextInputProps, LayoutProps {
    /**
     * GridModel whose data this control should search. This component will, by default, use the
     * fields for all *visible* columns when matching, as well as any groupBy field.
     */
    gridModel?: GridModel;

    /** Mode to use when searching (default 'startWord'). */
    matchMode?: 'start' | 'startWord' | 'any';

    /**
     * Delay (in ms) to buffer searching the grid after the value changes from user input.
     * Default 200ms. Set to 0 to filter immediately on each keystroke.
     */
    queryBuffer?: number;

    /**
     * Names of field(s) to include in search. Cannot be used with `excludeFields`.
     */
    includeFields?: string[];

    /** Names of field(s) to exclude from search. Cannot be used with `includeFields`. */
    excludeFields?: string[];
}

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
export const [GridFindField, gridFindField] = hoistCmp.withFactory<GridFindFieldProps>({
    displayName: 'GridFindField',
    className: 'xh-grid-find-field',
    render({className, model, ...props}) {
        let [layoutProps, restProps] = splitLayoutProps(props);
        const impl = useLocalModel(GridFindFieldImplModel);

        return hbox({
            width: 180,
            className,
            ...layoutProps,
            items: [
                textInput({
                    model: impl,
                    bind: 'query',
                    ref: impl.inputRef,
                    commitOnChange: true,
                    leftIcon: Icon.search(),
                    enableClear: true,
                    placeholder: 'Find',
                    selectOnFocus: true,
                    width: null,
                    flex: 1,
                    onKeyDown: e => {
                        switch (e.key) {
                            case 'Enter':
                                e.shiftKey ? impl.selectPrev() : impl.selectNext();
                                consumeEvent(e);
                                break;
                            case 'ArrowUp':
                                if (e.shiftKey) return;
                                impl.selectPrev();
                                consumeEvent(e);
                                break;
                            case 'ArrowDown':
                                if (e.shiftKey) return;
                                impl.selectNext();
                                consumeEvent(e);
                                break;
                        }
                    },
                    ...restProps
                }),
                controls({impl})
            ]
        });
    }
});

const controls = hoistCmp.factory(({impl}) => {
    const {hasFocus, hasQuery, hasResults, countLabel} = impl;
    if (!hasFocus && !hasQuery) return null;
    return hbox({
        className: 'xh-grid-find-field__controls',
        items: [
            span({
                omit: !countLabel,
                className: 'xh-grid-find-field__count-label',
                item: countLabel
            }),
            vbox(
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
            )
        ]
    });
});
