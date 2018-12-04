/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Record, RecordAction, StoreSelectionModel} from '@xh/hoist/data';
import {buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {GridModel} from '@xh/hoist/cmp/grid';
import {throwIf} from '@xh/hoist/utils/js';
import {Column} from '@xh/hoist/cmp/grid/columns';
import {isEmpty} from 'lodash';

import {recordActionButton} from './impl/RecordActionButton';

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
@HoistComponent
export class RecordActionBar extends Component {
    baseClassName = 'xh-record-action-bar';

    static propTypes = {
        /** RecordAction configs. */
        actions: PT.arrayOf(PT.object).isRequired,

        /** The data Record to associate with the actions. Required if selModel is omitted. */
        record: PT.oneOfType([PT.object, Record]),

        /** The selection model used to determine the selected records. Required if record is omitted. */
        selModel: PT.instanceOf(StoreSelectionModel),

        /** The grid model which contains the records we may act on. */
        gridModel: PT.instanceOf(GridModel),

        /** The column in a grid where this button is displayed. */
        column: PT.instanceOf(Column),

        /** Props to pass to the button components. */
        buttonProps: PT.object,

        /** Set to true to stack the buttons vertically. */
        vertical: PT.bool
    };

    render() {
        const {actions, record, selModel, gridModel, column, buttonProps, vertical, ...rest} = this.props;

        throwIf(!record && !selModel, 'You must provide either the record or selModel to RecordActionBar!');

        if (isEmpty(actions)) return null;

        return buttonGroup({
            vertical,
            items: actions.filter(Boolean).map(action => recordActionButton({
                action: new RecordAction(action),
                record,
                selModel,
                gridModel,
                column,
                ...buttonProps
            })),
            ...rest,
            className: this.getClassName()
        });
    }
}

export const recordActionBar = elemFactory(RecordActionBar);