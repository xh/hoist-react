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
import {isFunction} from 'lodash';

@HoistComponent
export class ActionBar extends Component {
    baseClassName = 'xh-action-bar';

    static propTypes = {
        /**
         * Actions to render in the bar. Action definitions support the following structure:
         * {
         *      icon,
         *      text,
         *      intent,
         *      className,
         *      action,
         *      data,
         *      tooltip,
         *      disabled
         * }
         */
        actions: PT.arrayOf(PT.object).isRequired
    };

    render() {
        const {actions} = this.props;
        return hbox({
            className: this.getClassName(),
            items: actions.map(action => this.renderAction(action))
        });
    }

    renderAction(actionDef) {
        let {icon, text, intent, className, action, data, tooltip, disabled} = actionDef;
        icon = this.getValue(icon);
        text = this.getValue(text);
        intent = this.getValue(intent);
        className = this.getValue(className);
        tooltip = this.getValue(tooltip);
        disabled = this.getValue(disabled);

        return button({
            icon,
            text,
            intent,
            className,
            tooltip,
            disabled,
            minimal: true,
            onClick: (ev) => {
                ev.stopPropagation();
                action({data, props: this.props});
            }
        });
    }

    getValue(prop) {
        if (isFunction(prop)) {
            return prop();
        }

        return prop;
    }
}

export const actionBar = elemFactory(ActionBar);