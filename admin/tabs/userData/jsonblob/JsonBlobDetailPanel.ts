/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {yesNoRenderer} from '@xh/hoist/admin/AdminUtils';
import {badgeRenderer} from '@xh/hoist/admin/columns';
import {jsonDetailRenderer, restDetailPanel} from '@xh/hoist/admin/detail/RestDetailPanel';
import {formFieldSet} from '@xh/hoist/cmp/form';
import {hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {archivedDateRenderer} from './JsonBlobColumns';
import {JsonBlobModel} from './JsonBlobModel';

/** Read-only detail view of the JSON Blob selected in the grid. */
export const jsonBlobDetailPanel = hoistCmp.factory<JsonBlobModel>({
    displayName: 'JsonBlobDetailPanel',
    model: uses(JsonBlobModel),

    render({model}) {
        return restDetailPanel({
            icon: Icon.json(),
            emptyText: 'Select a blob to view its details.',
            persistWith: {...model.persistWith, path: 'detailPanel'},
            renderForm: (record, formModel) => {
                const {description, meta, archived} = formModel.values,
                    // Meta is stored as JSON text - a serialized null is as empty as no value.
                    hasMeta = meta != null && meta !== 'null';
                return [
                    formFieldSet({
                        title: 'Blob',
                        items: [
                            hbox(
                                formField({field: 'type', flex: 1}),
                                formField({field: 'owner', flex: 1}),
                                formField({field: 'acl', flex: 1})
                            ),
                            formField({field: 'description', omit: !description}),
                            hbox(
                                formField({
                                    field: 'token',
                                    readonlyRenderer: badgeRenderer,
                                    flex: 1
                                }),
                                formField({
                                    field: 'archived',
                                    readonlyRenderer: yesNoRenderer,
                                    flex: 1
                                }),
                                formField({
                                    field: 'archivedDate',
                                    readonlyRenderer: archivedDateRenderer,
                                    omit: !archived,
                                    flex: 1
                                })
                            ),
                            hbox(
                                formField({
                                    field: 'dateCreated',
                                    label: 'Created',
                                    readonlyRenderer: dateTimeRenderer({}),
                                    flex: 1
                                }),
                                formField({
                                    field: 'lastUpdated',
                                    label: 'Updated',
                                    readonlyRenderer: dateTimeRenderer({}),
                                    flex: 1
                                }),
                                formField({field: 'lastUpdatedBy', label: 'Updated By', flex: 1})
                            )
                        ]
                    }),
                    // Value and Meta share the remaining height 3:2, favoring the value.
                    formFieldSet({
                        title: 'Value',
                        className: 'xh-admin-readonly-form__fill',
                        flex: 3,
                        item: formField({
                            field: 'value',
                            label: null,
                            readonlyRenderer: jsonDetailRenderer
                        })
                    }),
                    formFieldSet({
                        title: 'Meta',
                        className: 'xh-admin-readonly-form__fill',
                        flex: 2,
                        omit: !hasMeta,
                        item: formField({
                            field: 'meta',
                            label: null,
                            readonlyRenderer: jsonDetailRenderer
                        })
                    })
                ];
            }
        });
    }
});
