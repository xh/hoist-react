/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import {RecordAction} from '@xh/hoist/cmp/record';
import {recordActionButton} from './RecordActionButton';

import './RecordActionBar.scss';
import {StoreSelectionModel} from '../../../data/StoreSelectionModel';

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
        actions: PT.arrayOf(PT.oneOfType([PT.object, PT.instanceOf(RecordAction)])).isRequired,
        /** The data Record to associate with the actions. */
        record: PT.instanceOf(Record),
        /** Set to true to only show the action buttons when hovering over the action bar (or row when used in a grid). */
        showOnHoverOnly: PT.bool,

        selModel: PT.instanceOf(StoreSelectionModel),
        /** Data to pass through to action callbacks */
        context: PT.object,
        /**  */
        minimal: PT.bool,
        small: PT.bool,
        vertical: PT.bool
    };

    actions = [];

    constructor(props) {
        super(props);
        this.actions = props.actions
            .filter(Boolean)
            .map(it => new RecordAction(it));
    }

    render() {
        const {actions, record, selModel, context, minimal, small, vertical} = this.props,
            showOnHoverOnly = withDefault(props.showOnHoverOnly, false);

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