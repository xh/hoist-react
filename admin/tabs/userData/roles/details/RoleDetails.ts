/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {div, frame, placeholder, span, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {RoleDetailsModel} from './RoleDetailsModel';
import './RoleDetails.scss';

export const roleDetails = hoistCmp.factory({
    className: 'xh-admin-role-details',
    displayName: 'RoleDetails',
    model: creates(RoleDetailsModel),
    render({className, model}) {
        if (!model.role) return placeholder('No role selected.');
        return vframe({
            className,
            items: [details(), members()]
        });
    }
});

export const details = hoistCmp.factory(() =>
    form({
        fieldDefaults: {inline: true},
        item: div({
            className: 'xh-admin-role-details__form',
            items: [
                formField({field: 'name'}),
                formField({field: 'category'}),
                formField({
                    field: 'notes',
                    readonlyRenderer: v => {
                        return frame({
                            style: {overflowY: 'auto'},
                            height: 50,
                            item: v ?? span({item: 'N/A', className: 'xh-text-color-muted'})
                        });
                    }
                }),
                formField({field: 'lastUpdated'})
            ]
        })
    })
);

export const members = hoistCmp.factory(() =>
    panel({
        item: tabContainer()
    })
);
