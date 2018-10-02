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
        action: PT.oneOfType([PT.object, RecordAction])
    };

    constructor(props) {
        super(props);
        this.action = new RecordAction(props.action);
    }

    render() {
        const {action} = this,
            {selModel, context, minimal, ...rest} = this.props;

        let count, record = this.props.record, selection = [record];
        if (selModel) {
            count = selModel.count;
            selection = selModel.records;

            // Try to get the record from the selModel if not explicitly provided to the button
            if (!record) {
                if (count === 1) {
                    record = selModel.singleRecord;
                } else {
                    record = first(selModel.records);
                }
            }
        } else {
            count = record ? 1 : 0;
        }

        if (action.prepareFn) action.prepareFn({action, record, selection, context});

        const {text, icon, intent, disabled, tooltip, hidden} = action;

        if (hidden) return null;

        const requiredRecordsMet = action.meetsRecordRequirement(count);

        return button({
            className: this.getClassName(),
            minimal,
            text: minimal ? null : text,
            icon,
            intent,
            title: tooltip,
            disabled: disabled || !requiredRecordsMet,
            onClick: () => action.executeAsync({record, selModel, context}),
            ...rest
        });
    }
}

export const recordActionButton = elemFactory(RecordActionButton);