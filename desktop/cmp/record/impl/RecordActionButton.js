import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {RecordAction, Record, StoreSelectionModel} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Column} from '@xh/hoist/columns';
import {first, omit} from 'lodash';

/**
 * Button component used by RecordActionBar and in grid action columns.
 *
 * Not intended for use by applications.
 *
 * @private
 */
@HoistComponent
export class RecordActionButton extends Component {
    baseClassName = 'xh-record-action-button';

    static propTypes = {
        /** The action */
        action: PT.instanceOf(RecordAction).isRequired,
        /** The data Record this action is acting on. */
        record: PT.oneOfType([PT.object, Record]),
        /** The selection model used to determine the selected records */
        selModel: PT.instanceOf(StoreSelectionModel),
        /** The grid model which contains the records we may act on */
        gridModel: PT.instanceOf(GridModel),
        /** The column in a grid where this button is displayed */
        column: PT.instanceOf(Column),
        /** Set to true to use minimal button style and hide action text */
        minimal: PT.bool
    };

    render() {
        const {action, minimal, gridModel, selModel, column, ...rest} = this.props;

        let {record} = this.props, selectedRecords = record ? [record] : null;
        if (selModel) {
            selectedRecords = selModel.records;

            // Try to get the record from the selModel if not explicitly provided to the button
            if (!record) {
                if (selectedRecords.length === 1) {
                    record = selModel.singleRecord;
                } else {
                    record = first(selModel.records);
                }
            }
        }

        const params = {record, selectedRecords, gridModel, column},
            displaySpec = action.getDisplaySpec(params),
            {text, icon, intent, disabled, tooltip: title, hidden} = displaySpec;

        if (hidden) return null;

        return button({
            className: this.getClassName(),
            minimal,
            text: minimal ? null : text,
            icon,
            intent,
            title,
            disabled,
            onClick: () => action.call({record, selection: selectedRecords, gridModel, column}),
            ...omit(rest, 'record')
        });
    }
}

export const recordActionButton = elemFactory(RecordActionButton);