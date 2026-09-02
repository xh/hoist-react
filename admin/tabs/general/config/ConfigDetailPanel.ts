/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {valOrNa} from '@xh/hoist/admin/AdminUtils';
import {valueTypeRenderer} from '@xh/hoist/admin/columns';
import {form, formFieldSet} from '@xh/hoist/cmp/form';
import {filler, hbox, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {ConfigDetailModel} from './ConfigDetailModel';
import {configValue} from './ConfigValue';
import './ConfigDetailPanel.scss';

/**
 * Read-only detail view of the config selected in the grid, docked to its right. Shows the
 * config's metadata and every available view of its value - resolved, instance override,
 * database, and typedClass defaults - opening on the most-derived view.
 */
export const configDetailPanel = hoistCmp.factory({
    displayName: 'ConfigDetailPanel',
    model: creates(ConfigDetailModel),

    render({model}) {
        const {hasSelection, readonly, record, persistWith} = model;
        return panel({
            className: 'xh-admin-config-detail',
            title: hasSelection ? record.data.name : 'Config Detail',
            icon: Icon.settings(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 550,
                minSize: 400,
                persistWith
            },
            item: hasSelection
                ? detailForm()
                : placeholder(Icon.settings(), 'Select a config to view its details.'),
            bbar: toolbar({
                omit: !hasSelection || readonly,
                items: [
                    filler(),
                    button({
                        text: 'Edit',
                        icon: Icon.edit(),
                        intent: 'primary',
                        outlined: true,
                        onClick: () => model.edit()
                    })
                ]
            })
        });
    }
});

const detailForm = hoistCmp.factory<ConfigDetailModel>(({model}) => {
    const {formModel, record} = model,
        {note, valueType} = formModel.values;

    return form({
        model: formModel,
        fieldDefaults: {readonlyRenderer: valOrNa},
        item: vframe({
            className: 'xh-admin-config-detail__form xh-admin-readonly-form',
            items: [
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
                            formField({field: 'clientVisible', readonlyRenderer: yesNo, flex: 1})
                        ),
                        formField({field: 'note', omit: !note}),
                        hbox(
                            formField({field: 'lastUpdatedBy', flex: 1}),
                            formField({
                                field: 'lastUpdated',
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
                        'xh-admin-config-detail__value',
                        valueType === 'json' ? 'xh-admin-config-detail__value--fill' : null
                    ),
                    // Keyed by record so the value's tab set rebuilds on selection change.
                    item: configValue({key: record.id, formModel})
                })
            ]
        })
    });
});

const yesNo = v => (v ? 'Yes' : 'No');
