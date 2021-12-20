/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp} from '@xh/hoist/core';
import {StoreRecord, RecordAction, StoreSelectionModel} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import classNames from 'classnames';
import {first} from 'lodash';
import PT from 'prop-types';

/**
 * Button component used by RecordActionBar and in grid action columns.
 *
 * Not intended for use by applications.
 *
 * @private
 */
export const [RecordActionButton, recordActionButton] = hoistCmp.withFactory({
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
            {text, icon, intent, className: actionClassName, disabled, tooltip: title, hidden} = displaySpec;

        if (hidden) return null;

        return button({
            className: classNames(className, actionClassName),
            minimal,
            text: minimal ? null : text,
            icon,
            intent,
            title,
            disabled,
            onClick: () => action.call({record, selectedRecords, gridModel, column}),
            ...rest
        });
    }
});

RecordActionButton.propTypes = {
    /** The action */
    action: PT.instanceOf(RecordAction).isRequired,

    /** The data StoreRecord this action is acting on. */
    record: PT.oneOfType([PT.object, StoreRecord]),

    /** The selection model used to determine the selected records */
    selModel: PT.instanceOf(StoreSelectionModel),

    /** The grid model which contains the records we may act on */
    gridModel: PT.instanceOf(GridModel),

    /** The column in a grid where this button is displayed */
    column: PT.instanceOf(Column),

    /** Set to true to use minimal button style and hide action text */
    minimal: PT.bool
};
