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
import {StoreActionDefinition} from './StoreActionDefinition';

@HoistComponent
export class StoreActionBar extends Component {
    baseClassName = 'xh-store-action-bar';

    static propTypes = {
        /** StoreActionDefinition or configs to create. */
        actions: PT.arrayOf(PT.oneOfType([PT.object, PT.instanceOf(StoreActionDefinition)])).isRequired
    };

    actions = [];

    constructor(props) {
        super(props);

        this.actions = props.actions.map(it => {
            if (it instanceof StoreActionDefinition) return it;
            return new StoreActionDefinition(it);
        });
    }

    render() {
        const {actions} = this;
        return hbox({
            className: this.getClassName(),
            items: actions.map(action => this.renderAction(action))
        });
    }

    renderAction(action) {
        const {record} = this.props;

        if (action.prepareFn) action.prepareFn(action, record);

        if (action.hidden) return null;

        const {icon, text, intent, disabled, tooltip, actionFn} = action;
        return button({
            className: 'xh-store-action-button',
            small: true,
            minimal: true,
            icon,
            text,
            intent,
            title: tooltip,
            disabled,
            onClick: () => actionFn(action, record)
        });
    }
}

export const storeActionBar = elemFactory(StoreActionBar);