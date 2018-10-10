import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {RecordAction} from '@xh/hoist/data';
import {first} from 'lodash';
import {StoreSelectionModel, Record} from '../../../data';

/**
 * Button component used by RecordActionBar. Not intended for use by applications.
 * @private
 */
@HoistComponent
export class RecordActionButton extends Component {
    baseClassName = 'xh-record-action-button';

    static propTypes = {
        /** The action */
        action: PT.instanceOf(RecordAction).isRequired,
        /** The data Record this action is acting on. */
        record: PT.oneOfType([PT.object, Record]),
        /** Selection model to use for determining selected records */
        selModel: PT.instanceOf(StoreSelectionModel),
        /** Data to pass through to action callbacks */
        actionMetadata: PT.object,
        /** Set to true to use minimal button style and hide action text */
        minimal: PT.bool
    };

    render() {
        const {action, selModel, minimal, actionMetadata, ...rest} = this.props;

        let record = this.props.record, selection = [record];
        if (selModel) {
            selection = selModel.records;

            // Try to get the record from the selModel if not explicitly provided to the button
            if (!record) {
                if (selection.length === 1) {
                    record = selModel.singleRecord;
                } else {
                    record = first(selModel.records);
                }
            }
        }

        const params = {action, record, selection, ...actionMetadata},
            displayConfig = action.getDisplayConfig(params),
            {text, icon, intent, disabled, tooltip: title, hidden} = displayConfig;

        if (hidden) return null;

        return button({
            className: this.getClassName(),
            minimal,
            text: minimal ? null : text,
            icon,
            intent,
            title,
            disabled,
            onClick: () => action.actionFn({record, selModel, ...actionMetadata}),
            ...rest
        });
    }
}

export const recordActionButton = elemFactory(RecordActionButton);