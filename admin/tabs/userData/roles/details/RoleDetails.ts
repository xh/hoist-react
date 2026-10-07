/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {valOrNa} from '@xh/hoist/admin/AdminUtils';
import {form, formFieldSet} from '@xh/hoist/cmp/form';
import {frame, hbox, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {RoleDetailsModel} from './RoleDetailsModel';
import './RoleDetails.scss';

export const roleDetails = hoistCmp.factory({
    displayName: 'RoleDetails',
    className: 'xh-admin-role-details',
    model: creates(RoleDetailsModel),

    render({className, model}) {
        return model.role
            ? vframe({
                  className,
                  items: [details(), members()]
              })
            : placeholder(Icon.idBadge(), 'Select a role to view details...');
    }
});

const details = hoistCmp.factory(() =>
    form({
        fieldDefaults: {readonlyRenderer: valOrNa},
        item: formFieldSet({
            title: 'Role',
            className: 'xh-admin-role-details__form xh-admin-readonly-form',
            items: [
                hbox(formField({field: 'name', flex: 1}), formField({field: 'category', flex: 1})),
                formField({
                    field: 'notes',
                    readonlyRenderer: v =>
                        frame({
                            style: {overflowY: 'auto'},
                            maxHeight: 80,
                            item: valOrNa(v)
                        })
                }),
                formField({field: 'lastUpdated'})
            ]
        })
    })
);

const members = hoistCmp.factory<RoleDetailsModel>({
    render() {
        return panel({
            item: tabContainer()
        });
    }
});
