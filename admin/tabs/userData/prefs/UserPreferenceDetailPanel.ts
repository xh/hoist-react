/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {jsonRenderer, rawValueRenderer} from '@xh/hoist/admin/AdminUtils';
import {valueTypeRenderer} from '@xh/hoist/admin/columns';
import {restDetailPanel} from '@xh/hoist/admin/detail/RestDetailPanel';
import {formFieldSet} from '@xh/hoist/cmp/form';
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {Icon} from '@xh/hoist/icon';
import {UserPreferenceModel} from './UserPreferenceModel';

/** Read-only detail view of the user preference value selected in the grid. */
export const userPreferenceDetailPanel = hoistCmp.factory<UserPreferenceModel>({
    displayName: 'UserPreferenceDetailPanel',
    model: uses(UserPreferenceModel),

    render({model}) {
        return restDetailPanel({
            icon: Icon.bookmark(),
            emptyText: 'Select a user preference to view its details.',
            persistWith: {...model.persistWith, path: 'detailPanel'},
            renderForm: (record, formModel) => {
                const {type} = formModel.values,
                    isJson = type === 'json';
                return [
                    formFieldSet({
                        title: 'Preference',
                        items: [
                            hbox(
                                formField({field: 'username', flex: 1}),
                                formField({field: 'groupName', flex: 1}),
                                formField({
                                    field: 'type',
                                    readonlyRenderer: valueTypeRenderer,
                                    flex: 1
                                })
                            ),
                            hbox(
                                formField({field: 'lastUpdatedBy', label: 'Updated By', flex: 1}),
                                formField({field: 'lastUpdated', label: 'Updated', flex: 2})
                            )
                        ]
                    }),
                    formFieldSet({
                        title: 'Value',
                        className: isJson ? 'xh-admin-readonly-form__fill' : null,
                        item: formField({
                            field: 'userValue',
                            label: null,
                            readonlyRenderer: isJson ? jsonRenderer : rawValueRenderer
                        })
                    })
                ];
            }
        });
    }
});
