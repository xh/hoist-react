import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {RecordAction} from '@xh/hoist/data';
import {first} from 'lodash';

@HoistComponent
export class RecordActionButton extends Component {
    baseClassName = 'xh-record-action-button';
    action;

    static propTypes = {
        action: PT.oneOfType([PT.object, PT.instanceOf(RecordAction)])
    };

    constructor(props) {
        super(props);
        this.action = new RecordAction(props.action);
    }

    render() {
        const {action} = this,
            {record, selModel, context, minimal, ...rest} = this.props;

        if (action.prepareFn) action.prepareFn({action, record, selModel, context});

        const {text, icon, intent, disabled, tooltip, hidden} = action;

        if (hidden) return null;

        let count, rec = record;
        if (selModel) {
            count = selModel.count;

            if (count === 1) {
                rec = selModel.singleRecord;
            } else {
                rec = first(selModel.records);
            }
        } else {
            count = record ? 1 : 0;
        }

        const requiredRecordsMet = action.meetsRecordRequirement(count);

        return button({
            className: this.getClassName(),
            minimal,
            text: minimal ? null : text,
            icon,
            intent,
            title: tooltip,
            disabled: disabled || !requiredRecordsMet,
            onClick: () => action.executeAsync({record: rec, selModel, context}),
            ...rest
        });
    }
}

export const recordActionButton = elemFactory(RecordActionButton);