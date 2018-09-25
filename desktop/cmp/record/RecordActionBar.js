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
import {RecordAction} from '@xh/hoist/cmp/record';

import './RecordActionBar.scss';

@HoistComponent
export class RecordActionBar extends Component {
    baseClassName = 'xh-record-action-bar';

    static propTypes = {
        /** RecordAction or configs to create. */
        actions: PT.arrayOf(PT.oneOfType([PT.object, PT.instanceOf(RecordAction)])).isRequired
    };

    actions = [];

    constructor(props) {
        super(props);

        this.actions = props.actions.map(it => new RecordAction(it));
    }

    render() {
        const {actionsShowOnHover = true} = this.props,
            {actions} = this;

        return hbox({
            className: this.getClassName(actionsShowOnHover ? 'xh-show-on-hover' : null),
            items: actions.map(action => this.renderAction(action))
        });
    }

    renderAction(action) {
        const {record} = this.props;

        if (action.prepareFn) action.prepareFn(action, record);

        if (action.hidden) return null;

        const {icon, intent, disabled, tooltip, actionFn} = action;
        return button({
            className: 'xh-record-action-button',
            small: true,
            minimal: true,
            icon,
            intent,
            title: tooltip,
            disabled,
            onClick: () => actionFn(action, record)
        });
    }
}

export const recordActionBar = elemFactory(RecordActionBar);