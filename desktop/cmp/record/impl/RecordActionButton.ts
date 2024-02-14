/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp} from '@xh/hoist/core';
import {RecordAction, StoreRecord, StoreSelectionModel} from '@xh/hoist/data';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import classNames from 'classnames';
import {first} from 'lodash';

/** @internal */
export interface RecordActionButtonProps extends ButtonProps {
    /** The action to run. */
    action?: RecordAction;

    /** Set to true to use minimal button style and hide action text */
    minimal?: boolean;

    record?: StoreRecord;
    selModel?: StoreSelectionModel;
    gridModel?: GridModel;
    column?: Column;
}

/**
 * Button component used by RecordActionBar and in grid action columns.
 *
 * @internal
 */
export const [RecordActionButton, recordActionButton] =
    hoistCmp.withFactory<RecordActionButtonProps>({
        displayName: 'RecordActionButton',
        className: 'xh-record-action-button',

        render(props) {
            let {action, minimal, gridModel, selModel, column, record, className, ...rest} = props;

            let selectedRecords = record ? [record] : null;
            if (selModel) {
                selectedRecords = selModel.selectedRecords;

                // Try to get the record from the selModel if not explicitly provided to the button
                if (!record) {
                    if (selectedRecords.length === 1) {
                        record = selModel.selectedRecord;
                    } else {
                        record = first(selModel.selectedRecords);
                    }
                }
            }

            const params = {record, selectedRecords, gridModel, column},
                displaySpec = action.getDisplaySpec(params),
                {
                    text,
                    icon,
                    intent,
                    className: actionClassName,
                    disabled,
                    tooltip: title,
                    hidden
                } = displaySpec;

            if (hidden) return null;

            return button({
                className: classNames(className, actionClassName),
                minimal,
                text: minimal ? null : text,
                icon,
                intent,
                title,
                disabled,
                testId: action.testId,
                onClick: () => action.call({record, selectedRecords, gridModel, column}),
                ...rest
            });
        }
    });
