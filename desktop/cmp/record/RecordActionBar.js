/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Record, RecordAction, StoreSelectionModel} from '@xh/hoist/data';
import {withDefault} from '@xh/hoist/utils/js';
import {buttonGroup} from '@xh/hoist/kit/blueprint';

import {recordActionButton} from './RecordActionButton';
import './RecordActionBar.scss';

/**
 * Component that accepts data object and an array of one or more RecordActions, which it renders
 * as a row of minimal buttons. Primarily intended for use within a grid column elementRenderer to
 * display a set of row-level actions.
 *
 * To minimize UI clutter and avoid competing for the user's attention, set `showOnHoverOnly` to
 * true and the rendered buttons will only be visible when hovering over the component (or row when
 * used in a grid)
 */
@HoistComponent
export class RecordActionBar extends Component {

    baseClassName = 'xh-record-action-bar';

    static propTypes = {
        /** RecordActions to clone or configs to create. */
        actions: PT.arrayOf(PT.oneOfType([PT.object, RecordAction])).isRequired,
        /** The data Record to associate with the actions. */
        record: PT.oneOfType([PT.object, Record]),
        /** Set to true to only show the action buttons when hovering over the action bar (or row when used in a grid). */
        showOnHoverOnly: PT.bool,

        selModel: PT.instanceOf(StoreSelectionModel),

        /** Data to pass through to action callbacks */
        actionMetadata: PT.object,

        group: PT.bool,

        minimal: PT.bool,

        small: PT.bool,

        vertical: PT.bool
    };

    render() {
        const {actions, record, selModel, showOnHoverOnly, actionMetadata, minimal, small, vertical, ...rest} = this.props,
            showOnHover = withDefault(showOnHoverOnly, false);

        if (!actions) return null;

        return buttonGroup({
            vertical,
            className: this.getClassName(
                showOnHover ? 'xh-show-on-hover' : null,
                vertical ? 'xh-record-action-bar--vertical' : null,
                minimal ? 'xh-record-action-bar--minimal' : null,
                small ? 'xh-record-action-bar--small' : null
            ),
            items: actions.filter(Boolean).map(action => recordActionButton({
                action,
                record,
                selModel,
                actionMetadata,
                minimal,
                small
            })),
            ...rest
        });
    }
}

export const recordActionBar = elemFactory(RecordActionBar);