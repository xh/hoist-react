/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {markdownRenderer, yesNoRenderer} from '@xh/hoist/admin/AdminUtils';
import {valueTypeRenderer} from '@xh/hoist/admin/columns';
import {restDetailPanel} from '@xh/hoist/admin/detail/RestDetailPanel';
import {formFieldSet} from '@xh/hoist/cmp/form';
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {ConfigPanelModel} from './ConfigPanelModel';
import {configValue} from './ConfigValue';

/**
 * Read-only detail view of the config selected in the grid. Shows the config's metadata and every
 * available view of its value - resolved, instance override, database, and typedClass defaults -
 * opening on the most-derived view.
 */
export const configDetailPanel = hoistCmp.factory<ConfigPanelModel>({
    displayName: 'ConfigDetailPanel',
    model: uses(ConfigPanelModel),

    render({model}) {
        return restDetailPanel({
            icon: Icon.settings(),
            emptyText: 'Select a config to view its details.',
            persistWith: {...model.persistWith, path: 'detailPanel'},
            renderForm: (record, formModel) => {
                const {note, valueType} = formModel.values;
                return [
                    formFieldSet({
                        title: 'Config',
                        items: [
                            hbox(
                                formField({field: 'groupName', flex: 1}),
                                formField({
                                    field: 'valueType',
                                    readonlyRenderer: valueTypeRenderer,
                                    flex: 1
                                }),
                                formField({
                                    field: 'clientVisible',
                                    readonlyRenderer: yesNoRenderer,
                                    flex: 1
                                })
                            ),
                            formField({
                                field: 'note',
                                readonlyRenderer: markdownRenderer,
                                omit: !note
                            }),
                            hbox(
                                formField({field: 'lastUpdatedBy', label: 'Updated By', flex: 1}),
                                formField({
                                    field: 'lastUpdated',
                                    label: 'Updated',
                                    readonlyRenderer: dateTimeRenderer({}),
                                    flex: 2
                                })
                            )
                        ]
                    }),
                    formFieldSet({
                        title: 'Value',
                        // JSON values stretch to fill the remaining height - scalars sit compactly.
                        className: classNames(
                            valueType === 'json' ? 'xh-admin-readonly-form__fill' : null
                        ),
                        // Keyed by record so the value's tab set rebuilds on selection change.
                        item: configValue({key: record.id, formModel})
                    })
                ];
            }
        });
    }
});
