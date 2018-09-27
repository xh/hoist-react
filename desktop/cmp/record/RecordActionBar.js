/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {RecordAction} from '@xh/hoist/cmp/record';
import {vbox} from '../../../cmp/layout/Box';
import {recordActionButton} from './RecordActionButton';

import './RecordActionBar.scss';
import {StoreSelectionModel} from '../../../data/StoreSelectionModel';

/**
 * Component which lays out minimal icon buttons in a row.
 *
 * A list of RecordActions must be provided which define the appearance and the action which should
 * be triggered on button click.
 *
 * By default the action buttons will only be visible when hovering over the component (or the row
 * when used in a grid).
 */
@HoistComponent
export class RecordActionBar extends Component {
    baseClassName = 'xh-record-action-bar';

    static propTypes = {
        /** RecordActions to clone or configs to create. */
        actions: PT.arrayOf(PT.oneOfType([PT.object, PT.instanceOf(RecordAction)])).isRequired,
        /** Set to false to always show action buttons */
        showOnHover: PT.bool,
        record: PT.object,
        selModel: PT.instanceOf(StoreSelectionModel),
        /** Data to pass through to action callbacks */
        context: PT.object,
        /**  */
        minimal: PT.bool,
        small: PT.bool,
        vertical: PT.bool
    };

    render() {
        const {actions, record, selModel, context, minimal, small, vertical, showOnHover = true} = this.props;
        if (!actions) return null;

        return (vertical ? vbox : hbox)({
            className: this.getClassName(
                showOnHover ? 'xh-show-on-hover' : null,
                vertical ? 'xh-record-action-bar--vertical' : null,
                minimal ? 'xh-record-action-bar--minimal' : null,
                small ? 'xh-record-action-bar--small' : null
            ),
            items: actions.map(action => recordActionButton({action, record, selModel, context, minimal, small}))
        });
    }
}

export const recordActionBar = elemFactory(RecordActionBar);