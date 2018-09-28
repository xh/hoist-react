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
import {button} from '@xh/hoist/desktop/cmp/button';
import {Record, RecordAction} from '@xh/hoist/data';
import {withDefault} from '@xh/hoist/utils/js';

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
        actions: PT.arrayOf(PT.oneOfType([PT.object, PT.instanceOf(RecordAction)])).isRequired,
        /** The data Record to associate with the actions. */
        record: PT.instanceOf(Record),
        /** Set to true to only show the action buttons when hovering over the action bar (or row when used in a grid). */
        showOnHoverOnly: PT.bool
    };

    actions = [];

    constructor(props) {
        super(props);
        this.actions = props.actions
            .filter(Boolean)
            .map(it => new RecordAction(it));
    }

    render() {
        const {props, actions} = this,
            showOnHoverOnly = withDefault(props.showOnHoverOnly, false);

        return hbox({
            className: this.getClassName(showOnHoverOnly ? 'xh-show-on-hover' : null),
            items: actions.map(action => this.renderAction(action))
        });
    }

    renderAction(action) {
        const {record} = this.props;

        if (action.prepareFn) action.prepareFn(action, record, [record]);

        if (action.hidden) return null;

        const {icon, intent, disabled, tooltip, actionFn} = action;
        return button({
            className: 'xh-record-action-button',
            small: true,
            minimal: true,
            title: tooltip,
            icon,
            intent,
            disabled,
            onClick: () => actionFn(action, record, [record])
        });
    }
}

export const recordActionBar = elemFactory(RecordActionBar);