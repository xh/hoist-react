/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp} from '@xh/hoist/core';
import {RecordAction, RecordActionSpec, StoreRecord, StoreSelectionModel} from '@xh/hoist/data';
import {buttonGroup, ButtonGroupProps} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {recordActionButton, RecordActionButtonProps} from './impl/RecordActionButton';

export interface RecordActionBarProps extends ButtonGroupProps {
    /** Actions to include. */
    actions: Array<RecordActionSpec | RecordAction>;

    /** The StoreRecord to associate with the actions. Required if selModel is omitted. */
    record?: StoreRecord;

    /** The selection model used to determine the selected records. Required if record is omitted. */
    selModel?: StoreSelectionModel;

    /** The grid model which contains the records we may act on. */
    gridModel?: GridModel;

    /** The column in a grid where this button is displayed. */
    column?: Column;

    /** Props to pass to the button components. */
    buttonProps?: RecordActionButtonProps;

    /** Set to true to stack the buttons vertically. */
    vertical?: boolean;
}

/**
 * Component that accepts an array of one or more RecordActions, which it renders as buttons in a
 * ButtonGroup.
 *
 * The component must be provided either the `record` or the `selModel` to determine which record
 * to pass to the RecordAction callbacks. If provided, the `gridModel` and `column` will also be
 * passed to the RecordAction callbacks.
 *
 * @see RecordAction
 */
export const [RecordActionBar, recordActionBar] = hoistCmp.withFactory<RecordActionBarProps>({
    displayName: 'RecordActionBar',
    className: 'xh-record-action-bar',

    render(props) {
        const {
            actions,
            record,
            selModel,
            gridModel,
            column,
            buttonProps,
            vertical,
            testId,
            ...rest
        } = props;

        throwIf(
            !record && !selModel,
            'You must provide either the record or selModel to RecordActionBar!'
        );

        if (isEmpty(actions)) return null;

        return buttonGroup({
            vertical,
            items: actions.filter(Boolean).map(action =>
                recordActionButton({
                    action: action instanceof RecordAction ? action : new RecordAction(action),
                    record,
                    selModel,
                    gridModel,
                    column,
                    ...buttonProps
                })
            ),
            ...rest
        });
    }
});
